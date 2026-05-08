import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAndSaveActivities } from "@/lib/ai-activities";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const { searchParams } = new URL(req.url);
  const shouldRegenerate = searchParams.get("regenerate") === "true";

  try {
    const book = await (prisma as any).book.findUnique({
      where: { id: bookId },
      select: { id: true, quizId: true, title: true, author: true, contentUrl: true, allowMultipleAttempts: true, passScore: true },
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    // Fetch the main quiz AND other associated activities (games)
    let allActivities = await (prisma as any).activity.findMany({
      where: { bookId: bookId },
      select: { type: true, content: true, id: true, title: true }
    });

    // INTELLIGENT AUTO-GENERATION:
    // If no activities exist OR we explicitly requested regeneration
    if (allActivities.length === 0 || shouldRegenerate) {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        console.log(`[AI-INTEL] Proactive generation triggered for book: ${book.title}`);
        await generateAndSaveActivities({
          bookId: book.id,
          title: book.title,
          author: book.author || "Autor Desconocido",
          contentUrl: book.contentUrl || "",
          userId: (session.user as any).id || "",
          stage: "full"
        });
        
        // Refresh allActivities after generation
        allActivities = await (prisma as any).activity.findMany({
          where: { bookId: bookId },
          select: { type: true, content: true, id: true, title: true }
        });
      }
    }

    // Normalize statements to { text, isTrue }. The AI sometimes uses
    // "statement", "affirmation", "sentence" or returns plain strings,
    // which left the V/F games with empty text on screen.
    const normalizeStatements = (raw: any): Array<{ text: string; isTrue: boolean }> => {
      if (!Array.isArray(raw)) return [];
      const out: Array<{ text: string; isTrue: boolean }> = [];
      for (const it of raw) {
        if (!it) continue;
        if (typeof it === "string") {
          const t = it.trim();
          if (t) out.push({ text: t, isTrue: true });
          continue;
        }
        if (typeof it !== "object") continue;
        const text = String(
          it.text ?? it.statement ?? it.affirmation ?? it.sentence ?? it.question ?? ""
        ).trim();
        if (!text) continue;
        const truthy = it.isTrue ?? it.is_true ?? it.correct ?? it.answer ?? true;
        const isTrue = typeof truthy === "string"
          ? /^(true|verdadero|si|sí|t|v|1)$/i.test(truthy.trim())
          : Boolean(truthy);
        out.push({ text, isTrue });
      }
      return out;
    };

    // Normalize timeline events to plain strings (UI expects string[]).
    const normalizeTimeline = (raw: any): string[] => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((it: any) => {
          if (typeof it === "string") return it.trim();
          if (it && typeof it === "object") return String(it.event ?? it.text ?? it.title ?? "").trim();
          return "";
        })
        .filter(Boolean);
    };

    let consolidatedContent: any = {
      questions: [],
      memoryPairs: [],
      timelineEvents: [],
      keywords: [],
      sentences: [],
      statements: [],
      characterClues: [],
      countingQuestions: [],
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
          consolidatedContent.timelineEvents = content.timelineEvents || consolidatedContent.timelineEvents;
          consolidatedContent.sentences = content.sentences || consolidatedContent.sentences;
          consolidatedContent.statements = content.statements || consolidatedContent.statements;
          consolidatedContent.characterClues = content.characterClues || consolidatedContent.characterClues;
          consolidatedContent.countingQuestions = content.countingQuestions || consolidatedContent.countingQuestions;

          if (!mainQuizId) mainQuizId = activity.id;
        } else if (activity.type === "MATCH") {
          // Check if it's the new Timeline format (events) or legacy Memory (pairs)
          if (content.events) {
            consolidatedContent.timelineEvents = content.events || consolidatedContent.timelineEvents;
          } else if (content.pairs) {
            consolidatedContent.memoryPairs = content.pairs?.map((p: any) => ({
              character: p.word,
              description: p.def
            })) || consolidatedContent.memoryPairs;
          }
        } else if (activity.type === "WORDSEARCH") {
          consolidatedContent.keywords = content.words || consolidatedContent.keywords;
        } else if (activity.type === "REORDER") {
          consolidatedContent.sentences = content.sentences || consolidatedContent.sentences;
        }
      } catch (err) {
        console.error("Error parsing activity content:", err);
      }
    });

    // Final normalization so client games never receive variant key names
    // (statement vs text, event objects vs strings, etc.) that left the V/F
    // gestural game showing an empty question.
    consolidatedContent.statements = normalizeStatements(consolidatedContent.statements);
    consolidatedContent.timelineEvents = normalizeTimeline(consolidatedContent.timelineEvents);

    // Quiz / activity content only changes when admin regenerates IA. Short
    // private cache de-dupes the burst of useEffect calls when the reader and
    // GamesModal open at once.
    return NextResponse.json({
      quiz: {
        id: mainQuizId,
        content: consolidatedContent,
        title: book.title
      },
      allowMultipleAttempts: book.allowMultipleAttempts,
      passScore: book.passScore
    }, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
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
