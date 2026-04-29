import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export async function POST(req: Request) {
  try {
    const user = await getUserIdAndRole();
    if (!user) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { classId, bookId, title, dueDate, description } = body;

    if (!classId || !bookId || !title) {
      return NextResponse.json({ message: "Faltan campos obligatorios" }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        bookId,
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description || null,
      },
      include: { book: true }
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
