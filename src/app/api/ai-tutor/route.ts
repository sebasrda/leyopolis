
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

function fallbackTutorReply(message: string, context: any, mode?: string) {
  const bookTitle = context?.bookTitle || "el libro";
  const pageNum = context?.page || "—";
  const pageText = typeof context?.pageText === "string" ? context.pageText : "";
  const question = (message || "").trim();

  const normalized = question.toLowerCase();
  const sentences = pageText
    .replace(/\s+/g, " ")
    .split(/(?<=[\.\!\?])\s+/)
    .map((s: string) => s.trim())
    .filter(Boolean);
  const excerpt = sentences.slice(0, 3).join(" ");

  if (mode === "general" || bookTitle === "Asistente Docente") {
    return `Puedo ayudarte con planificación y seguimiento. Dime el objetivo de la clase y el nivel del grupo, y te propongo una actividad, una evaluación breve y un criterio de logro.`;
  }

  if (normalized.includes("resumen") || normalized.includes("resume") || normalized.includes("idea principal")) {
    if (excerpt) return `Resumen (pág. ${pageNum}, ${bookTitle}): ${excerpt}`;
    return `Aún no tengo texto suficiente de la página ${pageNum} para resumir. Intenta cambiar de página y vuelve a preguntar.`;
  }

  const matchDefine = question.match(/(?:que\s+significa|significado\s+de|define|definir)\s+(.+)/i);
  if (matchDefine?.[1]) {
    const term = matchDefine[1].replace(/[\"“”'’]/g, "").trim();
    if (term) {
      const inText = pageText.toLowerCase().includes(term.toLowerCase());
      if (inText) {
        return `En el contexto de la página ${pageNum} de "${bookTitle}", "${term}" se relaciona con el contenido que estás leyendo. Si me indicas la frase exacta donde aparece, te lo explico con más precisión.`;
      }
      return `Puedo ayudarte a definir "${term}" en el contexto de "${bookTitle}". Si lo seleccionas o me pegas la oración completa, te lo explico mejor.`;
    }
  }

  if (excerpt) {
    return `Según la página ${pageNum} de "${bookTitle}", esto se relaciona con: ${excerpt} Si me dices qué parte te confunde, te lo explico paso a paso.`;
  }
  return `Estoy listo para ayudarte con "${bookTitle}". No estoy recibiendo texto de la página ${pageNum}; intenta pasar de página o volver a abrir el libro y pregunta otra vez.`;
}

export async function POST(req: Request) {
  // Removing session check for development ease, or ensure user is logged in
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  // }

  try {
    const { message, context, mode } = await req.json();
    
    // Check for API Key
    const apiKey = process.env.GOOGLE_API_KEY;

    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        let aiResponse = "";

        // Models to try in order of preference
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest"];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });

                let prompt = "";
                
                if (mode === 'general' || context?.bookTitle === "Asistente Docente") {
                    prompt = `
                    You are an intelligent Teaching Assistant for a reading platform called 'Leyopolis'.
                    The user is a teacher asking for help with class management, lesson planning, or student progress analysis.
                    
                    The user asked: "${message}"
                    
                    Please answer the user's question helpfully and professionally. Keep your answer concise (under 4-5 sentences if possible).
                    Answer in Spanish.
                    `;
                } else {
                    const pageText = context?.pageText || "No page content available.";
                    const bookTitle = context?.bookTitle || "the book";
                    const pageNum = context?.page || "unknown";

                    prompt = `
                    You are an intelligent AI tutor for a reading platform called 'Leyopolis'. 
                    The user is reading the book "${bookTitle}" and is currently on page ${pageNum}.
                    
                    Here is the content of the current page they are reading:
                    """
                    ${pageText.substring(0, 3000)}
                    """
                    
                    The user asked: "${message}"
                    
                    Please answer the user's question based on the context of the page and the book. 
                    Be helpful, encouraging, and educational. Keep your answer concise (under 3-4 sentences if possible).
                    IMPORTANT: Answer in Spanish unless the user speaks another language.
                    If the question is unrelated to the book, politely steer them back to the topic or answer generally if appropriate.
                    `;
                }

                const result = await model.generateContent(prompt);
                const response = result.response;
                aiResponse = response.text();
                
                // If successful, break the loop
                if (aiResponse) break;

            } catch (apiError) {
                const msg = apiError instanceof Error ? apiError.message : String(apiError);
                console.error(`Gemini API Error with model ${modelName}:`, msg);
                // Continue to next model
            }
        }

        if (aiResponse) {
            return NextResponse.json({ 
                reply: aiResponse,
                timestamp: new Date().toISOString()
            });
        }
        
        const fallback = fallbackTutorReply(String(message || ""), context, mode);
        return NextResponse.json({
          reply: fallback,
          degraded: true,
          reason: "IA no disponible (cuota o conexión)",
          timestamp: new Date().toISOString(),
        });
    // If API Key is missing, inform the user instead of mocking
    } else {
        console.warn("GOOGLE_API_KEY not found.");
        const fallback = fallbackTutorReply(String(message || ""), context, mode);
        return NextResponse.json({
          reply: fallback,
          degraded: true,
          reason: "Falta GOOGLE_API_KEY",
          timestamp: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("AI Tutor Error:", error);
    return NextResponse.json({
      reply: "No pude procesar tu pregunta. Intenta de nuevo.",
      degraded: true,
      reason: "Error al procesar",
      timestamp: new Date().toISOString(),
    });
  }
}
