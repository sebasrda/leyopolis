import { prisma } from "@/lib/prisma";
import { generateWithOpenAI } from "./ai/openai";

interface GenerateActivitiesResult {
  questions?: any[];
  keywords?: string[];
  memoryPairs?: any[];
  sentences?: string[];
  statements?: any[];
}

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
}): Promise<GenerateActivitiesResult> {
  let finalRawText = rawText || "";
  const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  if (!geminiKey && !openaiKey) {
    throw new Error("No se encontraron llaves de API (Gemini u OpenAI).");
  }

    // Fetch PDF text if not provided
    if (!finalRawText && contentUrl) {
      try {
        let absoluteUrl = contentUrl;
        if (contentUrl.startsWith("/")) {
          const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
          absoluteUrl = `${baseUrl}${contentUrl}`;
        }
        
        console.log(`[AI-STATS] Fetching PDF from: ${absoluteUrl}`);
        const pdfRes = await fetch(absoluteUrl);
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const pdfParse = require("pdf-parse");
          const data = await pdfParse(pdfBuffer);
          finalRawText = data.text;
          console.log(`[AI-STATS] Extracted ${finalRawText.length} chars from PDF.`);
        } else {
          console.error(`[AI-STATS] Failed to fetch PDF: ${pdfRes.status} ${pdfRes.statusText}`);
        }
      } catch (err) {
        console.error("Error fetching/parsing PDF for AI:", err);
      }
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

    let pdfDataPart: any = null;
    let isMultimodal = false;

    if (!finalRawText || finalRawText.length < 50) {
      console.log(`[AI-STATS] Text extraction failed or too short. Falling back to Multimodal PDF analysis for: ${title}`);
      try {
        let absoluteUrl = contentUrl;
        if (contentUrl.startsWith("/")) {
          const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
          absoluteUrl = `${baseUrl}${contentUrl}`;
        }
        const pdfRes = await fetch(absoluteUrl);
        if (pdfRes.ok) {
          const buffer = await pdfRes.arrayBuffer();
          pdfDataPart = {
            inlineData: {
              data: Buffer.from(buffer).toString("base64"),
              mimeType: "application/pdf"
            }
          };
          isMultimodal = true;
        }
      } catch (err) {
        console.error("[AI-STATS] Failed to prepare multimodal part:", err);
      }
    }

    // If both failed, we still have title/author but it's risky. 
    // But let's let Gemini try if we at least have a title.
    const extract = finalRawText ? finalRawText.slice(0, 15000) : "Contenido no extraíble directamente, analice el PDF adjunto si está disponible.";

    let prompt = "";
    console.log(`[AI-STATS] Book: ${title}, Extracted text length: ${finalRawText?.length || 0}, Multimodal: ${isMultimodal}`);
    
  // Split 'full' stage into two distinct AI calls to ensure quality and prevent truncation
  if (stage === "full") {
    console.log(`[AI-STATS] Starting two-phase generation for book: ${title}`);
    try {
      const qResult = await generateAndSaveActivities({
        bookId, title, author, contentUrl, userId, rawText: finalRawText, stage: "questions-1"
      });
      console.log(`[AI-STATS] Phase 1 (Questions) complete. Questions generated: ${qResult.questions?.length || 0}`);
      
      const gResult = await generateAndSaveActivities({
        bookId, title, author, contentUrl, userId, rawText: finalRawText, stage: "games"
      });
      console.log(`[AI-STATS] Phase 2 (Games) complete.`);
      
      return { ...qResult, ...gResult };
    } catch (err) {
      console.error("[AI-STATS] Two-phase generation failed:", err);
      throw err;
    }
  }

  if (stage === "questions-1") {
    prompt = `Actúa como un experto pedagogo. 
    Libro: "${title}" de "${author}". 
    CONTEXTO: ${extract}
    TAREA: Genera exactamente 20 preguntas de opción múltiple de alta calidad que cubran todo el contenido (inicio, nudo y desenlace).
    REGLA: Cada pregunta debe tener 4 opciones (A, B, C, D) y un índice de respuesta corecta (0-3).
    SALIDA: Responde SOLO un JSON: {"questions": [{"question": "text", "options": ["opt0","opt1","opt2","opt3"], "correct": number}]}.`;
  } else if (stage === "games") {
    prompt = `Libro: "${title}" de "${author}". 
    CONTEXTO: ${extract}
    TAREA: Genera datos para juegos interactivos Premium.
    1. keywords: 15 palabras clave importantes para una Sopa de Letras.
    2. memoryPairs: 8 parejas de (personaje/concepto y su descripción/hecho clave).
    3. sentences: 6 frases destacadas para ordenar.
    4. statements: 10 afirmaciones sobre el libro (algunas verdaderas y otras falsas) con un campo "isTrue" (boolean).
    SALIDA: Responde SOLO un JSON: {"keywords": ["word1",...], "memoryPairs": [{"character": "X", "description": "Y"}], "sentences": ["frase1", ...], "statements": [{"text": "...", "isTrue": true/false}]}`;
  }
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  let result;
  let parsedJson;
  let lastError;
  const geminiModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b", "gemini-pro"];
  
  // PRIMARY ATTEMPT: Gemini
  if (genAI) {
    for (const modelName of geminiModels) {
      const aiModel = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      });

      for (let i = 0; i < 3; i++) {
        try {
          const contentParts: any[] = [prompt];
          if (isMultimodal && pdfDataPart) {
            contentParts.push(pdfDataPart);
          }
          
          const geminiResult = await aiModel.generateContent(contentParts);
          const responseText = geminiResult.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          parsedJson = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
          result = geminiResult;
          break;
        } catch (err: any) {
          lastError = err;
          const errMsg = err.message || "";
          if (errMsg.includes("429") || errMsg.includes("Too Many Requests") || errMsg.includes("quota")) {
            console.log(`[AI-STATS] Cuota Gemini agotada (${modelName}), reintentando...`);
            await sleep(5000);
            continue;
          }
          console.warn(`[AI-STATS] Gemini ${modelName} falló: ${lastError?.message}.`);
          break; 
        }
      }
      if (result) break;
    }
  }

  // SECONDARY ATTEMPT: OpenAI (as fallback or if Gemini failed)
  if (!result && openaiKey) {
    console.log(`[AI-STATS] Intentando fallback con OpenAI para: ${title}`);
    try {
      // NOTE: We don't send pdfDataPart to OpenAI here as it requires a different API structure, 
      // but for questions/JSON it excels with the 'extract' text.
      parsedJson = await generateWithOpenAI(prompt, "gpt-4o-mini");
      result = { source: "openai" };
    } catch (err: any) {
      lastError = err;
      console.error("[AI-STATS] Fallback OpenAI falló:", err.message);
    }
  }

  if (!result || !parsedJson) {
    throw new Error(`Error en Generación IA (Gemini+OpenAI): ${lastError?.message || "Sin respuesta"}`);
  }

  const parsed = parsedJson;
  
  // Stage 1: Create or Reset Quiz
  if (stage === "questions-1") {
    // Clear existing for this specific book
    await (prisma as any).activity.deleteMany({
      where: { bookId, OR: [{ title: { startsWith: "Quiz:" } }, { title: { startsWith: "Sopa de letras:" } }, { title: { startsWith: "Memoria:" } }, { title: { startsWith: "Ordenar:" } }] }
    });

    const quiz = await (prisma as any).activity.create({
      data: {
        title: `Quiz: ${title}`,
        type: "QUIZ",
        content: JSON.stringify({ 
          questions: parsed.questions || [],
          keywords: parsed.keywords || [],
          memoryPairs: parsed.memoryPairs || [],
          sentences: parsed.sentences || [],
          statements: parsed.statements || []
        }),
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

  // Stage 3: Create Games and Sync to Quiz
  else if (stage === "games") {
    // 1. Sync game data into the main QUIZ activity (for GamesModal consumption)
    const existingQuiz = await (prisma as any).activity.findFirst({
      where: { bookId, type: "QUIZ" }
    });

    if (existingQuiz) {
      const currentContent = JSON.parse(existingQuiz.content);
      await (prisma as any).activity.update({
        where: { id: existingQuiz.id },
        data: { 
          content: JSON.stringify({ 
            ...currentContent, 
            keywords: parsed.keywords || currentContent.keywords || [],
            memoryPairs: parsed.memoryPairs || currentContent.memoryPairs || [],
            sentences: parsed.sentences || currentContent.sentences || [],
            statements: parsed.statements || currentContent.statements || []
          }) 
        }
      });
    }

    // 2. Create separate game activities (for legacy/other views)
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
