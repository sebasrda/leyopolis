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

  const book = await (prisma as any).book.findUnique({ where: { id: bookId }, select: { id: true, title: true, author: true } });
  if (!book) return NextResponse.json({ message: "Book not found" }, { status: 404 });

  // 1. Fetch keys from DB
  const settings = await prisma.systemSetting.findMany();
  const settingsMap = settings.reduce((acc: Record<string, string>, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const sanitize = (key?: string) => (key || "").trim().replace(/^["']|["']$/g, '');
  const geminiKey = sanitize(settingsMap.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY);
  const openaiKey = sanitize(settingsMap.OPENAI_API_KEY || process.env.OPENAI_API_KEY);
  const openrouterKey = sanitize(settingsMap.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY);

  let games = fallbackGames(book.title);
  let jsonText = "";

  const fullPrompt = `Genera configuraciones JSON para 3 juegos educativos basados en el libro "${book.title}".
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
"""${extractedText.slice(0, 10000)}"""`;

  // PRIMARY: Gemini
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
      for (const modelName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(fullPrompt);
          jsonText = result.response.text().trim();
          if (jsonText) break;
        } catch (e) { console.error(`[AI-GEN] Gemini ${modelName} failed:`, e); }
      }
    } catch (e) { console.error("[AI-GEN] Gemini Primary failed:", e); }
  }

  // SECONDARY: OpenRouter
  if (!jsonText && openrouterKey) {
    try {
      const { generateWithOpenRouter } = await import("@/lib/ai/openrouter");
      const result = await generateWithOpenRouter(fullPrompt, openrouterKey, "google/gemini-2.0-flash-001");
      if (result) jsonText = JSON.stringify(result);
    } catch (e) { console.error("[AI-GEN] OpenRouter Secondary failed:", e); }
  }

  // TERTIARY: OpenAI
  if (!jsonText && openaiKey) {
    try {
      const { generateWithOpenAI } = await import("@/lib/ai/openai");
      const result = await generateWithOpenAI(fullPrompt, "gpt-4o-mini", openaiKey);
      if (result) jsonText = JSON.stringify(result);
    } catch (e) { console.error("[AI-GEN] OpenAI Tertiary failed:", e); }
  }

  if (jsonText) {
    try {
      const cleanJson = jsonText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(cleanJson ? cleanJson[0] : jsonText) as any;
      if (parsed && parsed.wordsearch && parsed.reorder && parsed.match) {
        games = parsed;
      }
    } catch (e) {
      console.error("[AI-GEN] JSON Parse failed, using fallback");
    }
  }

  const activityDb = prisma as unknown as {
    activity: { create: (args: { data: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string }> };
  };

  const [ws, reorder, match] = await Promise.all([
    (prisma as any).activity.create({
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
    (prisma as any).activity.create({
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
    (prisma as any).activity.create({
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



