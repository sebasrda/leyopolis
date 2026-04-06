import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isDemoMode } from "@/lib/access";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");

    const where: any = {};
    if (grade) where.grade = grade;
    if (subject) where.subject = subject;

    // In production, filter out demo books unless demo mode is on
    if (!isDemoMode()) {
      where.isDemo = false;
    }

    const books = await prisma.book.findMany({
      where,
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add quizId info
    const booksWithQuiz = books.map((b: any) => ({
      ...b,
      hasQuiz: !!b.quizId,
    }));

    return NextResponse.json(booksWithQuiz);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json({ error: 'Error al obtener libros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const book = await prisma.book.create({
      data: {
        title: body.title,
        author: body.author,
        description: body.description,
        coverImage: body.coverImage,
        category: body.category,
        language: body.language || "Español",
        difficulty: body.difficulty,
        format: body.format || "PDF",
        contentUrl: body.contentUrl,
        grade: body.grade || null,
        subject: body.subject || null,
        ageRange: body.ageRange || null,
      }
    });
    return NextResponse.json(book);
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json({ error: 'Error al crear libro' }, { status: 500 });
  }
}
