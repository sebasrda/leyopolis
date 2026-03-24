import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded demo teacher for prototype
const DEMO_TEACHER_ID = "clt_demo_teacher_001";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  try {
    const whereClause: any = {
        class: {
            teacherId: DEMO_TEACHER_ID
        }
    };
    
    if (classId) {
        whereClause.classId = classId;
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        book: true,
        class: true
      },
      orderBy: { dueDate: 'asc' }
    });
    
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, bookId, title, dueDate, description } = body;

    if (!classId || !bookId || !title || !dueDate) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const classExists = await prisma.class.findUnique({
        where: { id: classId }
    });

    if (!classExists || classExists.teacherId !== DEMO_TEACHER_ID) {
        return NextResponse.json({ error: "Unauthorized access to class" }, { status: 403 });
    }

    const newAssignment = await prisma.assignment.create({
        data: {
            classId,
            bookId,
            title,
            dueDate: new Date(dueDate),
            description
        },
        include: {
            book: true,
            class: true
        }
    });

    return NextResponse.json(newAssignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
