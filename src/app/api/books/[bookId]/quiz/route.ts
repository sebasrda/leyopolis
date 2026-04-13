import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const book = await (prisma as any).book.findUnique({
      where: { id: bookId },
      select: { quizId: true, title: true, allowMultipleAttempts: true, passScore: true },
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    // Fetch the main quiz AND other associated activities (games)
    const allActivities = await (prisma as any).activity.findMany({
      where: { bookId: bookId },
      select: { type: true, content: true, id: true, title: true }
    });

    let consolidatedContent: any = {
      questions: [],
      memoryPairs: [],
      keywords: [],
      sentences: [],
      statements: []
    };

    let mainQuizId = book.quizId;

    allActivities.forEach((activity: any) => {
      try {
        const content = typeof activity.content === 'string' ? JSON.parse(activity.content) : activity.content;
        
        if (activity.type === "QUIZ") {
          // In the new unified format, QUIZ content has everything
          consolidatedContent.questions = content.questions || consolidatedContent.questions;
          consolidatedContent.keywords = content.keywords || consolidatedContent.keywords;
          consolidatedContent.memoryPairs = content.memoryPairs || consolidatedContent.memoryPairs;
          consolidatedContent.sentences = content.sentences || consolidatedContent.sentences;
          consolidatedContent.statements = content.statements || consolidatedContent.statements;
          
          if (!mainQuizId) mainQuizId = activity.id;
        } else if (activity.type === "MATCH") {
          consolidatedContent.memoryPairs = content.pairs?.map((p: any) => ({
            character: p.word,
            description: p.def
          })) || consolidatedContent.memoryPairs;
        } else if (activity.type === "WORDSEARCH") {
          consolidatedContent.keywords = content.words || consolidatedContent.keywords;
        } else if (activity.type === "REORDER") {
          consolidatedContent.sentences = content.sentences || consolidatedContent.sentences;
        }
      } catch (err) {
        console.error("Error parsing activity content:", err);
      }
    });

    return NextResponse.json({ 
      quiz: {
        id: mainQuizId,
        content: consolidatedContent,
        title: book.title
      }, 
      allowMultipleAttempts: book.allowMultipleAttempts,
      passScore: book.passScore 
    });
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

    const book = await (prisma as any).book.findUnique({
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
    await (prisma as any).book.update({
      where: { id: bookId },
      data: { quizId: quiz.id },
    });

    return NextResponse.json({ quiz: { id: quiz.id } });
  } catch (error) {
    console.error("Error creating book quiz:", error);
    return NextResponse.json({ message: "Error al crear quiz" }, { status: 500 });
  }
}
