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
  const aiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });
  
  let prompt = "";
  if (quizFromFile && finalRawText) {
    prompt = `INSTRUCCIÓN SISTEMA: Actúa como un experto pedagogo. Extrae las preguntas del texto adjunto.
REQUERIMIENTO: Formatea el contenido en un JSON estricto.
LIBRO: "${title}".
TEXTO: ${finalRawText.slice(0, 10000)}

ESQUEMA JSON:
{
  "questions": [{"id": 1, "question": "texto", "options": ["A", "B", "C", "D"], "correctAnswer": 0}],
  "keywords": ["PALABRA"],
  "memoryPairs": [{"character": "A", "description": "B"}],
  "sentences": [{"id": 1, "sentence": "..."}]
}
Responde SOLO con JSON.`;
  } else {
    prompt = `INSTRUCCIÓN SISTEMA: Eres un generador de contenido educativo RAPIDO.
REGLA: Genera 15-20 preguntas de opción múltiple para "${title}" de "${author}".
JSON:
{
  "questions": [15-20 objetos],
  "keywords": [10 palabras],
  "memoryPairs": [6 parejas],
  "sentences": [5 frases]
}
No uses espacios innecesarios ni saltos de linea en el JSON final. Solo responde con el objeto JSON.
TEXTO: ${finalRawText ? finalRawText.slice(0, 15000) : "Usa tus conocimientos sobre el libro."}`;
  }

  const result = await aiModel.generateContent(prompt);
  const responseText = result.response.text();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  finalJsonString = jsonMatch ? jsonMatch[0] : responseText;

  if (!finalJsonString || finalJsonString.length < 100) {
    throw new Error("AI returned an invalid or too short response");
  }

  const parsedQuiz = JSON.parse(finalJsonString);
  
  // Validate question count
  if (!parsedQuiz.questions || parsedQuiz.questions.length < 5) {
     console.warn(`AI generated too few questions (${parsedQuiz.questions?.length}). Retrying with simpler prompt might be needed, but throwing for now.`);
     throw new Error(`AI generated insufficient questions: ${parsedQuiz.questions?.length}`);
  }

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
