import "@/lib/pdf-polyfill";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAndSaveActivities } from "@/lib/ai-activities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session?.user || !["ADMIN", "COORDINATOR", "SUPERADMIN"].includes(userRole)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { bookId } = await params;

  const book = await (prisma as any).book.findUnique({
    where: { id: bookId },
    select: { id: true, title: true, author: true, quizId: true },
  });
  if (!book) return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });

  try {
    const formData = await req.formData();
    const quizFile = formData.get("quizFile") as File;
    if (!quizFile || quizFile.size === 0) {
      return NextResponse.json({ message: "Archivo de quiz requerido" }, { status: 400 });
    }

    let rawText = "";
    let finalJsonString = "";
    let parsedQuiz: any = null;

    // Extract text from uploaded quiz file
    if (quizFile.name.endsWith(".json")) {
      finalJsonString = await quizFile.text();
    } else {
      const quizBuffer = Buffer.from(await quizFile.arrayBuffer());
      if (quizFile.name.endsWith(".pdf")) {
        let parser: any = null;
        try {
          const { PDFParse } = require("pdf-parse");
          parser = new PDFParse({ data: new Uint8Array(quizBuffer) });
          rawText = (await parser.getText()).text || "";
        } catch (e) { console.error("PDF parse error:", e); }
        finally { try { await parser?.destroy?.(); } catch {} }
      } else if (quizFile.name.endsWith(".docx") || quizFile.name.endsWith(".doc")) {
        try {
          const mammoth = require("mammoth");
          rawText = (await mammoth.extractRawText({ buffer: quizBuffer })).value;
        } catch (e) { console.error("DOCX parse error:", e); }
      } else {
        // Plain text file
        rawText = await quizFile.text();
      }
    }

    // Use the central AI coordinator with Triple AI fallback and robust extraction
    if (!finalJsonString && rawText) {
      console.log(`[AI-QUIZ] Processing manual quiz with hybrid AI for: ${book.title}`);
      try {
        const result = await generateAndSaveActivities({
          bookId: book.id,
          title: book.title,
          author: book.author || "Autor Desconocido",
          contentUrl: "", // We use rawText directly
          userId: (session.user as any).id,
          rawText: rawText,
          stage: "manual-quiz"
        });
        
        parsedQuiz = result;
      } catch (aiErr: any) {
        console.error("[AI-QUIZ] All AI providers failed for manual quiz:", aiErr);
        return NextResponse.json({ 
          message: "No se pudo procesar el archivo. La IA no logró extraer las preguntas con coherencia.",
          error: aiErr.message 
        }, { status: 500 });
      }
    } else if (finalJsonString) {
      parsedQuiz = JSON.parse(finalJsonString);
    }

    if (!parsedQuiz || !parsedQuiz.questions) {
      return NextResponse.json({ message: "No se encontró un cuestionario válido en el archivo." }, { status: 400 });
    }

    // Delete old quiz and games if they exist
    if (book.quizId) {
      await (prisma as any).activity.deleteMany({ where: { bookId: book.id } });
      await (prisma as any).book.update({ where: { id: book.id }, data: { quizId: null } });
    }

    // Create new Quiz
    const quiz = await (prisma as any).activity.create({
      data: {
        title: `Quiz: ${book.title}`,
        description: `Examen del profesor para "${book.title}"`,
        type: "QUIZ",
        content: JSON.stringify(parsedQuiz),
        points: 100,
        published: true,
        createdById: (session.user as any).id,
        bookId: book.id,
      },
    });
    await (prisma as any).book.update({ where: { id: book.id }, data: { quizId: quiz.id } });

    // Create game activities
    if (parsedQuiz.keywords?.length > 0) {
      await (prisma as any).activity.create({
        data: {
          title: `Sopa de letras: ${book.title}`, description: `Palabras clave de "${book.title}"`,
          type: "WORDSEARCH", content: JSON.stringify({ words: parsedQuiz.keywords.slice(0, 10), gridSize: 12 }),
          points: 50, published: true, createdById: (session.user as any).id, bookId: book.id,
        },
      });
    }
    if (parsedQuiz.memoryPairs?.length > 0) {
      await (prisma as any).activity.create({
        data: {
          title: `Memoria: ${book.title}`, description: `Personajes de "${book.title}"`,
          type: "MATCH", content: JSON.stringify({ pairs: parsedQuiz.memoryPairs.map((p: any, i: number) => ({ id: i+1, word: p.character, def: p.description })) }),
          points: 50, published: true, createdById: (session.user as any).id, bookId: book.id,
        },
      });
    }
    if (parsedQuiz.sentences?.length > 0) {
      await (prisma as any).activity.create({
        data: {
          title: `Ordenar: ${book.title}`, description: `Eventos de "${book.title}"`,
          type: "REORDER", content: JSON.stringify({ sentences: parsedQuiz.sentences }),
          points: 50, published: true, createdById: session.user.id, bookId: book.id,
        },
      });
    }

    return NextResponse.json({
      message: "Quiz actualizado exitosamente",
      questionsCount: parsedQuiz.questions?.length || 0,
    });
  } catch (error) {
    console.error("Quiz upload error:", error);
    return NextResponse.json({ message: "Error al procesar quiz", error: String(error) }, { status: 500 });
  }
}
