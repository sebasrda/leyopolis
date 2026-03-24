import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded demo teacher for prototype
const DEMO_TEACHER_ID = "clt_demo_teacher_001";

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  
  try {
    // 1. Verify class ownership
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
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // if (classData.teacherId !== DEMO_TEACHER_ID) {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    // }

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
    console.error("Error fetching class details:", error);
    return NextResponse.json({ error: 'Failed to fetch class details' }, { status: 500 });
  }
}
