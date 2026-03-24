import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

function fallbackGames(bookTitle: string) {
  return {
    wordsearch: { words: ["LEYOPOLIS", "LECTURA", "LIBRO", "HISTORIA"], gridSize: 10 },
    reorder: { sentences: [{ id: 1, sentence: `La historia de "${bookTitle}" se desarrolla en varios eventos.` }] },
    match: { pairs: [{ id: 1, word: "Personaje", def: "Descripción" }] },
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
  const extractedText = typeof body.text === "string" ? body.text : "";
  if (!bookId) return NextResponse.json({ message: "bookId required" }, { status: 400 });

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, title: true, author: true } });
  if (!book) return NextResponse.json({ message: "Book not found" }, { status: 404 });

  let games = fallbackGames(book.title);

  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const text = extractedText.slice(0, 6000);
      const result = await model.generateContent(
        `Genera configuraciones JSON para 3 juegos educativos basados en el libro "${book.title}".
Devuelve SOLO JSON válido (sin markdown) con el formato:
{
  "wordsearch": { "words": string[], "gridSize": number },
  "reorder": { "sentences": [ { "id": number, "sentence": string } ] },
  "match": { "pairs": [ { "id": number, "word": string, "def": string } ] }
}
Palabras: extrae nombres, lugares o conceptos del contexto.
Reorder: 3 frases con eventos ordenables.
Match: 6 pares personaje↔descripción o concepto↔definición.
Contexto:
"""${text}"""`
      );
      const raw = result.response.text().trim();
      const parsed = JSON.parse(raw) as any;
      if (parsed && parsed.wordsearch && parsed.reorder && parsed.match) games = parsed;
    } catch {
    }
  }

  const activityDb = prisma as unknown as {
    activity: { create: (args: { data: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string }> };
  };

  const [ws, reorder, match] = await Promise.all([
    activityDb.activity.create({
      data: {
        title: `Sopa de letras: ${book.title}`,
        description: `Juego generado para "${book.title}".`,
        type: "WORDSEARCH",
        content: JSON.stringify(games.wordsearch ?? {}),
        points: 100,
        published: true,
        createdById: user.userId,
        bookId: book.id,
      },
      select: { id: true },
    }),
    activityDb.activity.create({
      data: {
        title: `Ordenar eventos: ${book.title}`,
        description: `Juego generado para "${book.title}".`,
        type: "REORDER",
        content: JSON.stringify(games.reorder ?? {}),
        points: 100,
        published: true,
        createdById: user.userId,
        bookId: book.id,
      },
      select: { id: true },
    }),
    activityDb.activity.create({
      data: {
        title: `Relacionar conceptos: ${book.title}`,
        description: `Juego generado para "${book.title}".`,
        type: "MATCH",
        content: JSON.stringify(games.match ?? {}),
        points: 100,
        published: true,
        createdById: user.userId,
        bookId: book.id,
      },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({ wordsearchId: ws.id, reorderId: reorder.id, matchId: match.id });
}
