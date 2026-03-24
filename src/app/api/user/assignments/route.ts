import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded demo user for prototype
const DEMO_USER_ID = "clt_demo_user_001";

export async function GET() {
  try {
    // 1. Ensure user exists and is enrolled in at least one class
    let user = await prisma.user.findUnique({ 
        where: { id: DEMO_USER_ID },
        include: { enrolledClasses: true }
    });

    if (!user) {
        // Create demo user if not exists
        user = await prisma.user.create({
            data: {
                id: DEMO_USER_ID,
                name: "Estudiante Demo",
                email: "student@leyopolis.com",
                role: "STUDENT"
            },
            include: { enrolledClasses: true }
        });
    }

    // If not enrolled, enroll in the first available class
    if (user.enrolledClasses.length === 0) {
        const firstClass = await prisma.class.findFirst();
        if (firstClass) {
            await prisma.user.update({
                where: { id: DEMO_USER_ID },
                data: {
                    enrolledClasses: {
                        connect: { id: firstClass.id }
                    }
                }
            });
        }
    }

    // 2. Fetch assignments for enrolled classes
    const assignments = await prisma.assignment.findMany({
      where: {
        class: {
            students: {
                some: { id: DEMO_USER_ID }
            }
        }
      },
      include: {
        book: true,
        class: true
      },
      orderBy: { dueDate: 'asc' }
    });

    // 3. Check progress for each assignment
    const assignmentsWithProgress = await Promise.all(assignments.map(async (assignment) => {
        const userBook = await prisma.userBook.findUnique({
            where: {
                userId_bookId: {
                    userId: DEMO_USER_ID,
                    bookId: assignment.bookId
                }
            }
        });

        return {
            ...assignment,
            progress: userBook ? userBook.progress : 0,
            status: userBook && userBook.progress >= 100 ? 'COMPLETED' : 'PENDING'
        };
    }));
    
    return NextResponse.json(assignmentsWithProgress);
  } catch (error) {
    console.error("Error fetching user assignments:", error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}
