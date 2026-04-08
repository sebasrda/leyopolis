import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdAndRole } from '@/lib/access';

export async function GET() {
  try {
    const user = await getUserIdAndRole();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "COORDINATOR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const classes = await prisma.class.findMany({
      where: { teacherId: user.userId },
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
    const user = await getUserIdAndRole();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { institutionId: true } });

    const body = await request.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const newClass = await prisma.class.create({
        data: {
            name,
            teacherId: user.userId,
            institutionId: dbUser?.institutionId || null
        }
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}



