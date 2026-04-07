import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    // Extract text from uploaded quiz file
    if (quizFile.name.endsWith(".json")) {
      finalJsonString = await quizFile.text();
    } else {
      const quizBuffer = Buffer.from(await quizFile.arrayBuffer());
      if (quizFile.name.endsWith(".pdf")) {
        try {
          const pdfParse = require("pdf-parse");
          rawText = (await pdfParse(quizBuffer)).text;
        } catch (e) { console.error("PDF parse error:", e); }
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

    // Use AI to convert to structured JSON
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!finalJsonString && rawText && apiKey) {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const aiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Analiza el siguiente texto de un examen/quiz y conviértelo a JSON.
El texto proviene de un archivo subido como evaluación del libro "${book.title}" de "${book.author}".
EXTRAE las preguntas TAL CUAL están en el documento y formátalas en este esquema JSON:
{
  "questions": [{"id": 1, "question": "pregunta textual", "options": ["A", "B", "C", "D"], "correctAnswer": 0}],
  "keywords": ["PALABRA1", "PALABRA2"],
  "memoryPairs": [{"character": "Nombre", "description": "Relación"}],
  "sentences": [{"id": 1, "sentence": "Frase importante"}]
}
Si las preguntas no tienen opciones, inventa 4 opciones con 1 correcta.
También genera 8 palabras clave, 6 parejas de memoria y 5 frases.
Responde SOLO con JSON válido, sin markdown.

TEXTO DEL EXAMEN:
"""
${rawText.slice(0, 8000)}
"""`;

      const result = await aiModel.generateContent(prompt);
      finalJsonString = result.response.text().replace(/```json|```/g, "").trim();
    }

    if (!finalJsonString) {
      return NextResponse.json({ message: "No se pudo procesar el archivo de quiz" }, { status: 400 });
    }

    const parsedQuiz = JSON.parse(finalJsonString);

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
        createdById: session.user.id,
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
          points: 50, published: true, createdById: session.user.id, bookId: book.id,
        },
      });
    }
    if (parsedQuiz.memoryPairs?.length > 0) {
      await (prisma as any).activity.create({
        data: {
          title: `Memoria: ${book.title}`, description: `Personajes de "${book.title}"`,
          type: "MATCH", content: JSON.stringify({ pairs: parsedQuiz.memoryPairs.map((p: any, i: number) => ({ id: i+1, word: p.character, def: p.description })) }),
          points: 50, published: true, createdById: session.user.id, bookId: book.id,
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
