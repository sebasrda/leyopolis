import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdAndRole } from '@/lib/access';

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

    if (!classId || !bookId || !title) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await getUserIdAndRole();
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const classExists = await prisma.class.findUnique({
        where: { id: classId }
    });

    // Only allow if SuperAdmin, Admin, Coordinator, or the actual teacher of the class
    if (!classExists || (!['SUPERADMIN', 'ADMIN', 'COORDINATOR'].includes(auth.role) && classExists.teacherId !== auth.userId)) {
        return NextResponse.json({ error: "Unauthorized access to class" }, { status: 403 });
    }

    const newAssignment = await prisma.assignment.create({
        data: {
            classId,
            bookId,
            title,
            dueDate: dueDate ? new Date(dueDate) : null,
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



