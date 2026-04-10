import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        students: { select: { id: true, name: true, email: true, grade: true } },
        assignments: {
          include: { book: { select: { id: true, title: true } } },
          orderBy: { dueDate: "desc" },
        },
      },
    });

    if (!cls) {
      return NextResponse.json({ message: "Clase no encontrada" }, { status: 404 });
    }

    return NextResponse.json(cls);
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session?.user || (userRole !== "ADMIN" && userRole !== "TEACHER")) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name, teacherId, subject, grade, studentIds, bookIds } = await req.json();

    const data: any = {};
    if (name) data.name = name;
    if (teacherId && userRole === "ADMIN") data.teacherId = teacherId;
    if (subject !== undefined) data.subject = subject;
    if (grade !== undefined) data.grade = grade;

    if (studentIds && Array.isArray(studentIds)) {
      data.students = { set: studentIds.map((sid: string) => ({ id: sid })) };
    }
    if (bookIds && Array.isArray(bookIds)) {
      data.assignedBooks = { set: bookIds.map((bid: string) => ({ id: bid })) };
    }

    const updated = await prisma.class.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { students: true } },
        students: { select: { id: true } },
        assignedBooks: { select: { id: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating class:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || !("id" in session.user)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const cls = await prisma.class.findUnique({ where: { id } });
    if (!cls) {
      return NextResponse.json({ message: "Clase no encontrada" }, { status: 404 });
    }

    if (userRole !== "ADMIN" && cls.teacherId !== userId) {
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    }

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ message: "Clase eliminada" });
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
