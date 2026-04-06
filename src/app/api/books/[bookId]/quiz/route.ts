import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { quizId: true, title: true },
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    if (!book.quizId) {
      return NextResponse.json({ quiz: null, message: "Este libro no tiene quiz asociado" });
    }

    const quiz = await (prisma as any).activity.findUnique({
      where: { id: book.quizId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        content: true,
        points: true,
      },
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Error fetching book quiz:", error);
    return NextResponse.json({ message: "Error al obtener quiz" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireRole("ADMIN", "COORDINATOR", "TEACHER");
  if ("error" in auth) return auth.error;

  const { bookId } = await params;

  try {
    const body = await req.json();
    const { questions, title, description } = body;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, quizId: true },
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    // Create the quiz as an Activity
    const quiz = await (prisma as any).activity.create({
      data: {
        title: title || `Quiz: ${book.title}`,
        description: description || `Quiz de comprensión para "${book.title}"`,
        type: "QUIZ",
        content: JSON.stringify({ questions: questions || [] }),
        points: 100,
        published: true,
        createdById: auth.user.userId,
        bookId: book.id,
      },
    });

    // Link the quiz to the book
    await prisma.book.update({
      where: { id: bookId },
      data: { quizId: quiz.id },
    });

    return NextResponse.json({ quiz: { id: quiz.id } });
  } catch (error) {
    console.error("Error creating book quiz:", error);
    return NextResponse.json({ message: "Error al crear quiz" }, { status: 500 });
  }
}
