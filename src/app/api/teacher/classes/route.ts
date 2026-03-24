import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded demo teacher for prototype
const DEMO_TEACHER_ID = "clt_demo_teacher_001";

export async function GET() {
  try {
    // Ensure teacher exists
    let teacher = await prisma.user.findUnique({ where: { id: DEMO_TEACHER_ID } });
    if (!teacher) {
        teacher = await prisma.user.create({
            data: {
                id: DEMO_TEACHER_ID,
                name: "Profesor Demo",
                email: "teacher@leyopolis.com",
                role: "TEACHER"
            }
        });
    }

    const classes = await prisma.class.findMany({
      where: { teacherId: DEMO_TEACHER_ID },
      include: {
        _count: {
            select: { students: true }
        },
        assignments: {
            where: {
                dueDate: { gte: new Date() }
            },
            orderBy: { dueDate: 'asc' },
            take: 1,
            include: { book: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform to dashboard format
    const formattedClasses = classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        students: cls._count.students,
        activeAssignment: cls.assignments[0] ? `${cls.assignments[0].book.title}` : "Sin tarea activa",
        progress: Math.floor(Math.random() * 40) + 40, // Mock progress for now as we don't have aggregation yet
        nextDeadline: cls.assignments[0] ? cls.assignments[0].dueDate.toISOString() : null
    }));

    return NextResponse.json(formattedClasses);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const newClass = await prisma.class.create({
        data: {
            name,
            teacherId: DEMO_TEACHER_ID
        }
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
