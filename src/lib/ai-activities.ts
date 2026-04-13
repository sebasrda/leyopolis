import { prisma } from "@/lib/prisma";

export async function generateAndSaveActivities({
  bookId,
  title,
  author,
  contentUrl,
  userId,
  rawText,
  quizFromFile = false
}: {
  bookId: string;
  title: string;
  author: string;
  contentUrl: string;
  userId: string;
  rawText?: string;
  quizFromFile?: boolean;
}) {
  let finalRawText = rawText || "";
  let finalJsonString = "";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

  if (!apiKey) {
    throw new Error("Missing Gemini API Key");
  }

  // Stage 1: If no rawText provided, try to fetch it from contentUrl
  if (!finalRawText && contentUrl) {
    try {
      const pdfRes = await fetch(contentUrl);
      if (pdfRes.ok) {
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(pdfBuffer);
        finalRawText = data.text;
      }
    } catch (err) {
      console.error("Error fetching/parsing PDF for AI:", err);
    }
  }

  // Stage 2: AI Generation
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-2.0-flash which is fast
  const aiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  let prompt = "";
  if (quizFromFile && finalRawText) {
    prompt = `Analiza el siguiente texto de un examen/quiz y conviértelo a JSON.
Libro: "${title}".
EXTRAE las preguntas TAL CUAL están en el documento y formátalas en este esquema JSON:
{
  "questions": [{"id": 1, "question": "pregunta textual", "options": ["A", "B", "C", "D"], "correctAnswer": 0}],
  "keywords": ["PALABRA1", "PALABRA2"],
  "memoryPairs": [{"character": "Nombre", "description": "Relación"}],
  "sentences": [{"id": 1, "sentence": "Frase importante"}]
}
Responde SOLO con JSON válido.
TEXTO: ${finalRawText.slice(0, 8000)}`;
  } else {
    prompt = `Genera un exhaustivo JSON educativo basado en el libro "${title}" de "${author}".
Esquema estricto y obligatorio:
{
  "questions": [{"id": 1, "question": "pregunta", "options": ["A", "B", "C", "D"], "correctAnswer": 0}],
  "keywords": ["PALABRA1", "PALABRA2"],
  "memoryPairs": [{"character": "Término", "description": "Definición o Relación"}],
  "sentences": [{"id": 1, "sentence": "Frase clave para ordenar"}]
}
REGLA CRÍTICA: Debes generar MÍNIMO 20 preguntas desafiantes sobre la lectura, 20 palabras clave relevantes, 10 parejas de memoria y 10 frases para ordenar.
Responde SOLO con un JSON válido y bien formado. Sin markdown, sin explicaciones.`;
    
    if (finalRawText) {
      prompt += `\nESTE ES UN EXTRACTO DEL LIBRO. USA ESTA INFORMACIÓN PARA GENERAR LAS PREGUNTAS:\nTEXTO: ${finalRawText.slice(0, 25000)}`;
    }
  }

  const result = await aiModel.generateContent(prompt);
  const responseText = result.response.text();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  finalJsonString = jsonMatch ? jsonMatch[0] : responseText;

  if (!finalJsonString) {
    throw new Error("AI returned empty response");
  }

  const parsedQuiz = JSON.parse(finalJsonString);

  // Stage 3: Clear existing AI activities for this book to avoid duplicates
  await (prisma as any).activity.deleteMany({
    where: {
      bookId,
      title: { startsWith: "Quiz:" }
    }
  });
  await (prisma as any).activity.deleteMany({
    where: {
      bookId,
      OR: [
        { title: { startsWith: "Sopa de letras:" } },
        { title: { startsWith: "Memoria:" } },
        { title: { startsWith: "Ordenar:" } }
      ]
    }
  });

  // Stage 4: Create new ones
  const quiz = await (prisma as any).activity.create({
    data: {
      title: `Quiz: ${title}`,
      description: quizFromFile ? `Examen para "${title}"` : `Quiz generado por IA para "${title}"`,
      type: "QUIZ",
      content: JSON.stringify(parsedQuiz),
      points: 100,
      published: true,
      createdById: userId,
      bookId: bookId,
    },
  });

  await (prisma as any).book.update({
    where: { id: bookId },
    data: { quizId: quiz.id }
  });

  // Games
  if (parsedQuiz.keywords?.length > 0) {
    await (prisma as any).activity.create({
      data: {
        title: `Sopa de letras: ${title}`, type: "WORDSEARCH", 
        content: JSON.stringify({ words: parsedQuiz.keywords.slice(0, 15), gridSize: 12 }),
        points: 50, published: true, createdById: userId, bookId: bookId,
      },
    });
  }
  if (parsedQuiz.memoryPairs?.length > 0) {
    await (prisma as any).activity.create({
      data: {
        title: `Memoria: ${title}`, type: "MATCH",
        content: JSON.stringify({ pairs: parsedQuiz.memoryPairs.map((p: any, i: number) => ({ id: i+1, word: p.character, def: p.description })) }),
        points: 50, published: true, createdById: userId, bookId: bookId,
      },
    });
  }
  if (parsedQuiz.sentences?.length > 0) {
    await (prisma as any).activity.create({
      data: {
        title: `Ordenar: ${title}`, type: "REORDER", content: JSON.stringify({ sentences: parsedQuiz.sentences }),
        points: 50, published: true, createdById: userId, bookId: bookId,
      },
    });
  }

  return parsedQuiz;
}
