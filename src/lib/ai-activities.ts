import { prisma } from "@/lib/prisma";
import { generateWithOpenAI } from "./ai/openai";
import { generateWithOpenRouter } from "./ai/openrouter";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface GenerateActivitiesResult {
  questions?: any[];
  keywords?: string[];
  timelineEvents?: string[];
  sentences?: string[];
  statements?: any[];
  synopsis?: string;
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
  stage?: "full" | "questions-1" | "questions-2" | "games-all" | "games-1" | "games-2" | "games" | "synopsis" | "sel-workshop" | "sel-part-1" | "sel-part-2" | "manual-quiz";
}): Promise<GenerateActivitiesResult> {
  let finalRawText = rawText || "";
  
  // 1. Fetch keys from Database (SystemSetting) or Environment
  const settings = await prisma.systemSetting.findMany();
  const settingsMap = settings.reduce((acc: Record<string, string>, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const sanitize = (key?: string) => (key || "").trim().replace(/^["']|["']$/g, '');

  const geminiKey = sanitize(settingsMap.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  const openaiKey = sanitize(settingsMap.OPENAI_API_KEY || process.env.OPENAI_API_KEY);
  const openrouterKey = sanitize(settingsMap.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY);
  const anthropicKey = sanitize(settingsMap.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);

  if (!geminiKey && !openaiKey && !openrouterKey && !anthropicKey) {
    throw new Error("No se encontraron llaves de IA configuradas (Gemini, OpenAI, OpenRouter o Anthropic).");
  }

  console.log(`[AI-STATS] Credenciales: Gemini(${geminiKey ? 'OK' : 'X'}), OpenAI(${openaiKey ? 'OK' : 'X'}), OpenRouter(${openrouterKey ? 'OK' : 'X'}), Anthropic(${anthropicKey ? 'OK' : 'X'})`);

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

    const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

    let pdfDataPart: any = null;
    let isMultimodal = false;

    if (!finalRawText || finalRawText.length < 50) {
      console.log(`[AI-STATS] No se pudo extraer texto o es muy corto (${finalRawText?.length || 0} chars). Intentando Multimodal para: ${title}`);
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
        console.error("[AI-STATS] Error al preparar parte multimodal:", err);
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
        bookId, title, author, contentUrl, userId, rawText: finalRawText, stage: "games-all"
      });
      console.log(`[AI-STATS] Phase 2 (Games) complete.`);
      
      return { ...qResult, ...gResult };
    } catch (err) {
      console.error("[AI-STATS] Two-phase generation failed:", err);
      throw err;
    }
  }

  // Orchestrate games generation in two parts
  if (stage === "games-all") {
    console.log(`[AI-STATS] Starting two-phase games generation for: ${title}`);
    try {
      const g1 = await generateAndSaveActivities({
        bookId, title, author, contentUrl, userId, rawText: finalRawText, stage: "games-1"
      });
      const g2 = await generateAndSaveActivities({
        bookId, title, author, contentUrl, userId, rawText: finalRawText, stage: "games-2"
      });
      return { ...g1, ...g2 };
    } catch (err) {
      console.error("[AI-STATS] Games-all generation failed:", err);
      throw err;
    }
  }

  // Unified ODS SEL stage: split into two parts of 25 questions each
  if (stage === "sel-workshop") {
    console.log(`[AI-STATS] Starting two-phase SEL workshop generation for: ${title}`);
    try {
      const part1 = await generateAndSaveActivities({
        bookId, title, author, contentUrl, userId, rawText: finalRawText, stage: "sel-part-1"
      });
      console.log(`[AI-STATS] SEL Part 1 complete. Questions: ${part1.questions?.length}`);
      
      const part2 = await generateAndSaveActivities({
        bookId, title, author, contentUrl, userId, rawText: finalRawText, stage: "sel-part-2"
      });
      console.log(`[AI-STATS] SEL Part 2 complete. Questions: ${part2.questions?.length}`);
      
      return { 
        questions: [...(part1.questions || []), ...(part2.questions || [])]
      };
    } catch (err) {
      console.error("[AI-STATS] ODS SEL generation failed:", err);
      throw err;
    }
  }

  if (stage === "questions-1") {
    prompt = `Actúa como un experto pedagogo de élite. 
    Libro: "${title}" de "${author}". 
    CONTEXTO: ${extract}
    
    TAREA: Genera EXACTAMENTE 20 preguntas de opción múltiple de alta calidad y precisión sobre la trama, personajes y temas del libro.
    REGLA 1: Cada pregunta DEBE tener 4 opciones (A, B, C, D) y un índice de respuesta correcta 'correctAnswer' (0-3).
    REGLA 2: No uses NUNCA placeholders como "Opción A", "Respuesta Correcta" o similares. Genera contenido real y desafiante.
    REGLA 3: Cubre todo el libro (inicio, nudo y desenlace).
    
    SALIDA: Responde SOLO un JSON: {
      "questions": [{"question": "texto de la pregunta", "options": ["opcion0","opcion1","opcion2","opcion3"], "correctAnswer": número}], 
      "synopsis": "un resumen pedagógico profundo y atractivo en máximo 150 palabras"
    }.`;
  } else if (stage === "manual-quiz") {
    prompt = `Actúa como un asistente pedagógico experto. 
    El profesor ha subido un documento con una evaluación para el libro "${title}".
    
    TAREA: Analiza el texto del profesor y extráelo fielmente a formato JSON.
    INSTRUCCIONES CRÍTICAS:
    1. IDENTIFICA las respuestas correctas si están marcadas en el texto (ej: negrita, "(X)", "Correcta", o una clave de respuesta al final).
    2. Si el profesor no incluyó la respuesta correcta, ANALIZA el contenido y márcala tú basándote en la lógica.
    3. Si el profesor subió menos de 20 preguntas, COMPLETA el quiz hasta llegar a 20 manteniendo el estilo del profesor.
    4. Genera también datos para juegos (keywords, memoryPairs, sentences).
    
    SALIDA: Responde SOLO un JSON: {
      "questions": [{"question": "texto", "options": ["opt0","opt1","opt2","opt3"], "correctAnswer": index}],
      "keywords": ["PALABRA1", ...],
      "memoryPairs": [{"character": "Nombre", "description": "Relación"}],
      "sentences": [{"id": 1, "sentence": "Frase para ordenar"}]
    }
    
    ORDEN: No uses placeholders. Sé preciso.
    TEXTO DEL PROFESOR:
    """
    ${extract}
    """`;
  } else if (stage === "games-1") {
    prompt = `Libro: "${title}" de "${author}".
    CONTEXTO: ${extract}
    TAREA: Genera datos para juegos interactivos literarios (Parte 1).

    INSTRUCCIONES:
    1. keywords: 15 palabras clave únicas e importantes del libro (mínimo 4 letras, máximo 12).
    2. timelineEvents: Exactamente 6 eventos CRUCIALES en ESTRICTO ORDEN CRONOLÓGICO. Frase clara (máximo 15 palabras cada una).
    3. characterClues: 4 personajes, conceptos o elementos importantes del libro. Para cada uno, 3 pistas progresivas (de más vaga a más específica) sin revelar el nombre directamente. Formato: [{"name": "Nombre", "clues": ["Pista vaga", "Pista media", "Pista clara"]}]

    SALIDA: Responde SOLO un JSON válido: {"keywords": [...], "timelineEvents": [...], "characterClues": [...]}`;
  } else if (stage === "games-2") {
    prompt = `Libro: "${title}" de "${author}".
    CONTEXTO: ${extract}
    TAREA: Genera datos para juegos interactivos literarios (Parte 2).

    INSTRUCCIONES:
    1. sentences: 6 frases CORTAS y SIGNIFICATIVAS del libro para reordenar (entre 5 y 10 palabras por frase).
    2. statements: 10 afirmaciones sobre el libro (algunas verdaderas y otras falsas) con campo "isTrue" (boolean).
    3. countingQuestions: 5 preguntas numéricas sobre el libro cuya respuesta sea un número del 1 al 5. Formato: [{"question": "¿Cuántos...?", "answer": 3, "hint": "Pista corta"}]

    SALIDA: Responde SOLO un JSON válido: {"sentences": [...], "statements": [...], "countingQuestions": [...]}`;
  } else if (stage === "games" || (stage as any) === "games-all") {
    // Stage 'games' is now deprecated but kept for safety, redirecting to games-all logic if called directly
    // but the orchestration is handled in the if statement above. 
    // This prompt is a backup.
    prompt = `Libro: "${title}" de "${author}". 
    CONTEXTO: ${extract}
    TAREA: Genera datos para juegos interactivos (Keywords, Timeline, Sentences, Statements).
    SALIDA: Responde SOLO un JSON con los 4 campos mencionados.`;
  } else if (stage === "synopsis") {
    prompt = `Actúa como un experto pedagogo y crítico literario. 
    Libro: "${title}" de "${author}". 
    CONTEXTO: ${extract}
    TAREA: Genera un resumen pedagógico breve, atractivo y profesional del libro.
    REGLA: Máximo 150 palabras. Debe resaltar el valor educativo y los temas principales.
    SALIDA: Responde SOLO un JSON: {"synopsis": "texto del resumen"}`;
  } else if (stage === "sel-part-1" || stage === "sel-part-2") {
    const partNum = stage === "sel-part-1" ? "1" : "2";
    prompt = `Actúa como un experto pedagogo enfocado en Aprendizaje Socioemocional (SEL) y los Objetivos de Desarrollo Sostenible (ODS).
    Libro: "${title}" de "${author}".
    CONTEXTO: ${extract}
    
    TAREA: Genera la PARTE ${partNum} de un taller interactivo. Necesito exactamente 25 preguntas de opción múltiple.
    ENFOQUE: Las preguntas deben evaluar o explorar las emociones de los personajes (SEL), resolución de conflictos, autoconocimiento, conciencia social y los retos vinculados a los ODS (ej. igualdad, paz, medio ambiente, equidad). 
    Deben ser creativas y pedagógicas.
    
    REGLA: Cada pregunta debe tener 4 opciones (A, B, C, D) y un índice de respuesta correcta (0-3).
    SALIDA: Responde SOLO un JSON: {"questions": [{"question": "text", "options": ["opt0","opt1","opt2","opt3"], "correctAnswer": number}]}`;
  }
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  // Production Sync Trigger: Ensure Vercel re-builds with latest Environment Variables
  
  let result: any;
  let parsedJson: any;
  let allErrors: string[] = [];
  // Use a tiered list of models. If one is 429 (quota) or 404 (not found), we pivot.
  const geminiModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
  const providersAttempted: string[] = [];
  
  // PRIMARY ATTEMPT: Anthropic/Claude (Most powerful, prompt caching optimized)
  if (anthropicKey) {
    providersAttempted.push("Anthropic Claude");
    console.log(`[AI-STATS] Intentando con Anthropic Claude para: ${title}`);
    try {
      const { OpenAI: OpenAIClient } = await import("openai");
      const anthropicClient = new OpenAIClient({
        apiKey: anthropicKey,
        baseURL: "https://api.anthropic.com/v1/",
        defaultHeaders: {
          "anthropic-version": "2023-06-01",
          "x-api-key": anthropicKey,
        }
      });
      
      const response = await anthropicClient.chat.completions.create({
        model: "claude-3-5-sonnet-20240620",
        messages: [
          { role: "system", content: "Actúas como un experto pedagogo que genera contenido educativo en JSON estricto para una plataforma de lectura infantil." },
          { role: "user", content: prompt }
        ],
        max_tokens: 4096,
      });
      
      const content = response.choices[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
          result = { source: "anthropic" };
          console.log("[AI-STATS] Éxito con Anthropic");
        }
      }
    } catch (err: any) {
      allErrors.push(`Anthropic: ${err.message || String(err)}`);
      console.error("[AI-STATS] Anthropic Claude falló:", err.message);
    }
  }

  // SECONDARY ATTEMPT: OpenRouter (High availability, using Claude or fallback)
  if (!result && openrouterKey) {
    providersAttempted.push("OpenRouter");
    console.log(`[AI-STATS] Intentando con OpenRouter (Modelo: anthropic/claude-3.5-sonnet)`);
    try {
      parsedJson = await generateWithOpenRouter(prompt, openrouterKey, "anthropic/claude-3.5-sonnet");
      if (parsedJson) {
        result = { source: "openrouter" };
        console.log(`[AI-STATS] Éxito con OpenRouter`);
      }
    } catch (err: any) {
      allErrors.push(`OpenRouter (claude-3.5-sonnet): ${err.message || String(err)}`);
      console.error("[AI-STATS] OpenRouter falló:", err.message);
      
      // Fallback to a cheaper/more available model on OpenRouter if Claude fails
      try {
        console.log("[AI-STATS] Re-intentando OpenRouter con google/gemini-2.0-flash-001...");
        parsedJson = await generateWithOpenRouter(prompt, openrouterKey, "google/gemini-2.0-flash-001");
        if (parsedJson) {
          result = { source: "openrouter-fallback" };
          console.log("[AI-STATS] Éxito con OpenRouter (Gemini fallback)");
        }
      } catch (e2: any) {
        allErrors.push(`OpenRouter (gemini-2.0-flash): ${e2.message || String(e2)}`);
      }
    }
  }

  // TERTIARY ATTEMPT: Gemini
  if (!result && genAI) {
    providersAttempted.push("Google Gemini (Direct)");
    for (const modelName of geminiModels) {
      if (result) break;
      
      console.log(`[AI-STATS] Probando modelo Gemini: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const contentParts: any[] = [prompt];
        
        if (isMultimodal && pdfDataPart) {
          contentParts.push(pdfDataPart);
        }

        const response = await model.generateContent(contentParts);
        const text = response.response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
          result = { source: `gemini-${modelName}` };
          console.log(`[AI-STATS] Éxito con Gemini: ${modelName}`);
          break;
        }
      } catch (err: any) {
        const errMsg = err.message || String(err);
        allErrors.push(`Gemini (${modelName}): ${errMsg}`);
        console.warn(`[AI-STATS] Gemini ${modelName} falló:`, errMsg.slice(0, 100));
        
        if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
          continue; 
        }
      }
    }
  }

  // QUATERNARY ATTEMPT: OpenAI (Direct)
  if (!result && openaiKey) {
    providersAttempted.push("OpenAI (Direct)");
    console.log(`[AI-STATS] Intentando fallback con OpenAI para: ${title}`);
    try {
      parsedJson = await generateWithOpenAI(prompt, "gpt-4o-mini", openaiKey);
      if (parsedJson) {
        result = { source: "openai" };
        console.log("[AI-STATS] Éxito con OpenAI");
      }
    } catch (err: any) {
      allErrors.push(`OpenAI: ${err.message || String(err)}`);
      console.error("[AI-STATS] Fallback OpenAI falló:", err.message);
    }
  }

  if (!result || !parsedJson) {
    const errorPrefix = `Error en Generación IA (Híbrida): `;
    const errorBody = allErrors.join(" | ");
    const attemptedMsg = providersAttempted.length > 0 ? ` (Intentados: ${providersAttempted.join(", ")})` : "";
    
    // Check if ALL of the attempted providers returned a quota/limit error
    const allQuota = allErrors.length > 0 && allErrors.every(err => err.includes("429") || err.toLowerCase().includes("quota") || err.toLowerCase().includes("limit"));
    
    if (allQuota) {
      throw new Error(`${errorPrefix} Límite de cuota alcanzado en TODOS los proveedores configurados${attemptedMsg}. Por favor, revisa tus saldos.`);
    }
    
    throw new Error(`${errorPrefix}${attemptedMsg}. Detalles: ${errorBody}`);
  }

  // DATA NORMALIZATION: Ensure all questions use 'correctAnswer' (UI standard)
  if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
    parsedJson.questions = parsedJson.questions.map((q: any) => {
      // Handle 'correct' -> 'correctAnswer' rename if AI slips up
      if (q.correct !== undefined && q.correctAnswer === undefined) {
        q.correctAnswer = q.correct;
      }
      return q;
    });
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
          timelineEvents: parsed.timelineEvents || [],
          sentences: (parsed.sentences || []).map((s: string, i: number) => ({ id: i, sentence: s })),
          statements: parsed.statements || []
        }),
        points: 100, published: true, createdById: userId, bookId: bookId,
      },
    });

    await (prisma as any).book.update({
      where: { id: bookId },
      data: { 
        quizId: quiz.id,
        description: parsed.synopsis || undefined 
      }
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
  else if (stage === "games" || (stage as any) === "games-all" || stage === "games-1" || stage === "games-2") {
    // 1. Sync game data into the main QUIZ activity (for GamesModal consumption)
    const existingQuiz = await (prisma as any).activity.findFirst({
      where: { bookId, type: "QUIZ" }
    });

    if (existingQuiz) {
      const currentContent = JSON.parse(existingQuiz.content);
      const updatedContent = { 
        ...currentContent, 
        keywords: (parsed.keywords && parsed.keywords.length > 0) ? parsed.keywords : currentContent.keywords || [],
        timelineEvents: (parsed.timelineEvents && parsed.timelineEvents.length > 0) ? parsed.timelineEvents : currentContent.timelineEvents || [],
        sentences: (parsed.sentences && parsed.sentences.length > 0) ? (parsed.sentences || []).map((s: string, i: number) => ({ id: i, sentence: s })) : currentContent.sentences || [],
        statements: (parsed.statements && parsed.statements.length > 0) ? parsed.statements : currentContent.statements || [],
        characterClues: (parsed.characterClues && parsed.characterClues.length > 0) ? parsed.characterClues : currentContent.characterClues || [],
        countingQuestions: (parsed.countingQuestions && parsed.countingQuestions.length > 0) ? parsed.countingQuestions : currentContent.countingQuestions || [],
      };

      await (prisma as any).activity.update({
        where: { id: existingQuiz.id },
        data: { content: JSON.stringify(updatedContent) }
      });
    }

    // 2. Create/Update separate game activities (for legacy/other views)
    if (parsed.keywords?.length > 0) {
      await (prisma as any).activity.deleteMany({ where: { bookId, type: "WORDSEARCH" } });
      await (prisma as any).activity.create({
        data: {
          title: `Sopa de letras: ${title}`, type: "WORDSEARCH", 
          content: JSON.stringify({ words: parsed.keywords, gridSize: 12 }),
          points: 50, published: true, createdById: userId, bookId: bookId,
        },
      });
    }
    if (parsed.timelineEvents?.length > 0) {
      await (prisma as any).activity.deleteMany({ where: { bookId, type: "MATCH", title: { startsWith: "Cronología" } } });
      await (prisma as any).activity.create({
        data: {
          title: `Cronología: ${title}`, type: "MATCH",
          content: JSON.stringify({ events: parsed.timelineEvents }),
          points: 50, published: true, createdById: userId, bookId: bookId,
        },
      });
    }
    if (parsed.sentences?.length > 0) {
      await (prisma as any).activity.deleteMany({ where: { bookId, type: "REORDER" } });
      await (prisma as any).activity.create({
        data: {
          title: `Ordenar: ${title}`, type: "REORDER", content: JSON.stringify({ sentences: parsed.sentences }),
          points: 50, published: true, createdById: userId, bookId: bookId,
        },
      });
    }
  }

  // Stage: Synopsis Only (Non-destructive)
  else if (stage === "synopsis") {
    await (prisma as any).book.update({
      where: { id: bookId },
      data: { description: parsed.synopsis || undefined }
    });
  }

  return parsed;
}
