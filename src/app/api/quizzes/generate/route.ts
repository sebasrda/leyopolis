import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

function fallbackQuiz(bookTitle: string) {
  return {
    title: `Quiz: ${bookTitle}`,
    description: "Quiz generado en modo degradado (IA no disponible).",
    type: "QUIZ",
    points: 100,
    content: {
      questions: [
        { id: 1, question: "¿Cuál es el tema principal del texto?", options: ["A", "B", "C", "D"], correctAnswer: 0 },
        { id: 2, question: "Selecciona la afirmación verdadera.", options: ["A", "B", "C", "D"], correctAnswer: 0 },
        { id: 3, question: "¿Qué personaje/idea es más relevante?", options: ["A", "B", "C", "D"], correctAnswer: 1 },
        { id: 4, question: "¿Qué evento ocurre primero?", options: ["A", "B", "C", "D"], correctAnswer: 2 },
        { id: 5, question: "¿Cuál es la conclusión más razonable?", options: ["A", "B", "C", "D"], correctAnswer: 0 },
        { id: 6, question: "Verdadero o falso: el texto presenta un conflicto.", options: ["Verdadero", "Falso", "No se determina", "No aplica"], correctAnswer: 0 },
        { id: 7, question: "Completa: La idea clave es ____.", answer: "idea" },
        { id: 8, question: "Respuesta corta: ¿Qué aprendiste?", answer: "—" },
      ],
    },
  };
}

export async function POST(req: Request) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "COORDINATOR" && user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const bookId = typeof body.bookId === "string" ? body.bookId : "";
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const extractedText = typeof body.text === "string" ? body.text : "";

  if (!bookId) return NextResponse.json({ message: "bookId required" }, { status: 400 });

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, title: true, author: true } });
  if (!book) return NextResponse.json({ message: "Book not found" }, { status: 404 });

  const apiKey = process.env.GOOGLE_API_KEY;
  let quiz = fallbackQuiz(book.title);

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const text = extractedText.slice(0, 7000);
      const result = await model.generateContent(
        `Genera un quiz tipo Moodle en español para el libro "${book.title}" de ${book.author}.
Devuelve SOLO JSON válido (sin markdown) con el formato:
{
 "title": string,
 "description": string,
 "type":"QUIZ",
 "points":100,
 "content": { "questions":[ { "id": number, "question": string, "options"?: string[4], "correctAnswer"?: number, "answer"?: string } ] }
}
Incluye: 5 opción múltiple, 1 verdadero/falso, 1 completar frase, 1 respuesta corta.
Contexto extraído (puede estar incompleto):
"""${text}"""
Instrucción del profesor/coordinador: "${prompt}"`
      );
      const raw = result.response.text().trim();
      const parsed = JSON.parse(raw) as any;
      if (parsed && parsed.content && Array.isArray(parsed.content.questions)) quiz = parsed;
    } catch {
    }
  }

  const activityDb = prisma as unknown as { activity: { create: (args: { data: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string }> } };
  const created = await activityDb.activity.create({
    data: {
      title: typeof quiz.title === "string" ? quiz.title : `Quiz: ${book.title}`,
      description: typeof quiz.description === "string" ? quiz.description : null,
      type: "QUIZ",
      content: JSON.stringify(quiz.content ?? {}),
      points: 100,
      published: true,
      createdById: user.userId,
      bookId: book.id,
      excerpt: extractedText ? extractedText.slice(0, 2000) : null,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id });
}

