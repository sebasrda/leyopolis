import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdAndRole } from '@/lib/access';
import { apiError, unauthorized, forbidden, notFound } from '@/lib/apiError';

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;

  // ── Auth + IDOR check ──────────────────────────────────────────
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();
  if (!["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(user.role)) {
    return forbidden("role not allowed");
  }

  try {
    const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
            students: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    xp: true,
                    level: true,
                    streak: true,
                    lastActive: true
                }
            },
            assignments: {
                orderBy: { dueDate: 'desc' },
                include: {
                    book: {
                        select: {
                            id: true,
                            title: true,
                            coverImage: true
                        }
                    }
                }
            }
        }
    });

    if (!classData) {
        return notFound("class not found");
    }

    // OWNERSHIP CHECK:
    // - TEACHER: must own the class (be its teacher)
    // - COORDINATOR/ADMIN: must share institution
    // - SUPERADMIN: bypass
    if (user.role === "TEACHER") {
      if (classData.teacherId !== user.userId) {
        return forbidden("not your class");
      }
    } else if (user.role === "COORDINATOR" || user.role === "ADMIN") {
      const me = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { institutionId: true },
      });
      if (me?.institutionId && classData.institutionId !== me.institutionId) {
        return forbidden("class outside your institution");
      }
    }

    // 2. Fetch reading progress for students in this class
    const studentIds = classData.students.map(s => s.id);
    const bookIds = classData.assignments.map(a => a.book.id);
    
    const readings = await prisma.userBook.findMany({
        where: {
            userId: { in: studentIds },
            bookId: { in: bookIds }
        },
        select: {
            userId: true,
            bookId: true,
            progress: true,
            lastRead: true
        }
    });

    // 3. Combine data to create a "Gradebook" view
    const studentsWithProgress = classData.students.map(student => {
        const studentReadings = readings.filter(r => r.userId === student.id);
        const avgProgress = studentReadings.length > 0 
            ? studentReadings.reduce((acc, curr) => acc + curr.progress, 0) / studentReadings.length 
            : 0;

        return {
            ...student,
            avgProgress: Math.round(avgProgress),
            assignmentsCompleted: studentReadings.filter(r => r.progress >= 100).length
        };
    });

    return NextResponse.json({
        ...classData,
        students: studentsWithProgress
    });

  } catch (error) {
    return apiError(error, 500, "fetch class details failed");
  }
}
