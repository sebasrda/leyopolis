import { prisma } from "@/lib/prisma";

export async function generateAndSaveActivities({
  bookId,
  title,
  author,
  contentUrl,
  userId,
  rawText,
  quizFromFile = false,
  stage = "full"
}: {
  bookId: string;
  title: string;
  author: string;
  contentUrl: string;
  userId: string;
  rawText?: string;
  quizFromFile?: boolean;
  stage?: "full" | "questions-1" | "questions-2" | "games";
}) {
  let finalRawText = rawText || "";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

  if (!apiKey) throw new Error("Missing Gemini API Key");

  // Fetch PDF text if not provided
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

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);

  let prompt = "";
  let systemContext = `Libro: "${title}" de "${author}". `;
  let extract = finalRawText ? finalRawText.slice(0, 12000) : "Sin extracto.";

  if (stage === "questions-1") {
    prompt = `${systemContext} Genera 10 preguntas de opción múltiple (4 opciones, index 0-3). 
    Responde SOLO un JSON: {"questions": [...]}. No incluyas otros campos. TEXTO: ${extract}`;
  } else if (stage === "questions-2") {
    prompt = `${systemContext} Genera OTRAS 10 preguntas DE COMPRENSIÓN DISTINTAS a las anteriores. 
    Responde SOLO un JSON: {"questions": [...]}. TEXTO: ${extract}`;
  } else if (stage === "games") {
    prompt = `${systemContext} Genera actividades lúdicas. 
    Responde SOLO un JSON: {"keywords": [10], "memoryPairs": [{"character": "A", "description": "B"} (6)], "sentences": [5]}. TEXTO: ${extract}`;
  } else {
    // Full mode (risky on Hobby)
    prompt = `Genera un JSON con {"questions": [15], "keywords": [10], "memoryPairs": [6], "sentences": [5]} para "${title}". TEXTO: ${extract}`;
  }
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  let result;
  let lastError;
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  
  for (const modelName of models) {
    const aiModel = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    });

    for (let i = 0; i < 3; i++) { // Máximo 3 reintentos por modelo
      try {
        result = await aiModel.generateContent(prompt);
        if (result) break;
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || "";
        if (errMsg.includes("429") || errMsg.includes("Too Many Requests") || errMsg.includes("quota")) {
          console.log(`Límite de cuota alcanzado para ${modelName}, reintentando en 3s... (Intento ${i+1}/3)`);
          await sleep(3000);
          continue;
        }
        throw err;
      }
    }
    if (result) break;
  }

  if (!result) {
    throw new Error(`Cuota de IA agotada tras varios reintentos: ${lastError?.message || "Error desconocido"}`);
  }

  const responseText = result.response.text();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const finalJsonString = jsonMatch ? jsonMatch[0] : responseText;
  const parsed = JSON.parse(finalJsonString);
  
  // Stage 1: Create or Reset Quiz
  if (stage === "questions-1" || stage === "full") {
    // Clear existing for this specific book
    await (prisma as any).activity.deleteMany({
      where: { bookId, OR: [{ title: { startsWith: "Quiz:" } }, { title: { startsWith: "Sopa de letras:" } }, { title: { startsWith: "Memoria:" } }, { title: { startsWith: "Ordenar:" } }] }
    });

    const quiz = await (prisma as any).activity.create({
      data: {
        title: `Quiz: ${title}`,
        type: "QUIZ",
        content: JSON.stringify({ questions: parsed.questions || [] }),
        points: 100, published: true, createdById: userId, bookId: bookId,
      },
    });

    await (prisma as any).book.update({
      where: { id: bookId },
      data: { quizId: quiz.id }
    });
  } 
  
  // Stage 2: Append Questions
  else if (stage === "questions-2") {
    const existingQuiz = await (prisma as any).activity.findFirst({
      where: { bookId, type: "QUIZ" }
    });

    if (existingQuiz) {
      const currentContent = JSON.parse(existingQuiz.content);
      const newQuestions = [...(currentContent.questions || []), ...(parsed.questions || [])];
      await (prisma as any).activity.update({
        where: { id: existingQuiz.id },
        data: { content: JSON.stringify({ ...currentContent, questions: newQuestions }) }
      });
    }
  }

  // Stage 3: Create Games
  else if (stage === "games" || stage === "full") {
    if (parsed.keywords?.length > 0) {
      await (prisma as any).activity.create({
        data: {
          title: `Sopa de letras: ${title}`, type: "WORDSEARCH", 
          content: JSON.stringify({ words: parsed.keywords, gridSize: 12 }),
          points: 50, published: true, createdById: userId, bookId: bookId,
        },
      });
    }
    if (parsed.memoryPairs?.length > 0) {
      await (prisma as any).activity.create({
        data: {
          title: `Memoria: ${title}`, type: "MATCH",
          content: JSON.stringify({ pairs: parsed.memoryPairs.map((p: any, i: number) => ({ id: i+1, word: p.character, def: p.description })) }),
          points: 50, published: true, createdById: userId, bookId: bookId,
        },
      });
    }
    if (parsed.sentences?.length > 0) {
      await (prisma as any).activity.create({
        data: {
          title: `Ordenar: ${title}`, type: "REORDER", content: JSON.stringify({ sentences: parsed.sentences }),
          points: 50, published: true, createdById: userId, bookId: bookId,
        },
      });
    }
  }

  return parsed;
}
