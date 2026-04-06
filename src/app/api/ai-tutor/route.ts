import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;

  // Block students from AI
  if (role === "STUDENT") {
    return NextResponse.json({ 
      message: "Acceso IA no disponible para estudiantes",
      blocked: true 
    }, { status: 403 });
  }

  try {
    const { message, context, mode } = await req.json();
    
    const apiKey = process.env.GOOGLE_API_KEY;

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      let aiResponse = "";
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
            ⚠️ Incluye siempre al final: "Uso exclusivo educativo dentro del aula."
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
          if (aiResponse) break;
        } catch (apiError) {
          const msg = apiError instanceof Error ? apiError.message : String(apiError);
          console.error(`Gemini API Error with model ${modelName}:`, msg);
        }
      }

      if (aiResponse) {
        return NextResponse.json({ 
          reply: aiResponse,
          timestamp: new Date().toISOString()
        });
      }
      
      return NextResponse.json({
        reply: fallbackTutorReply(String(message || ""), context, mode),
        degraded: true,
        reason: "IA no disponible (cuota o conexión)",
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn("GOOGLE_API_KEY not found.");
      return NextResponse.json({
        reply: fallbackTutorReply(String(message || ""), context, mode),
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

function fallbackTutorReply(message: string, context: any, mode?: string) {
  const bookTitle = context?.bookTitle || "el libro";
  const pageNum = context?.page || "—";
  const pageText = typeof context?.pageText === "string" ? context.pageText : "";
  const sentences = pageText.replace(/\s+/g, " ").split(/(?<=[\.\!\?])\s+/).map((s: string) => s.trim()).filter(Boolean);
  const excerpt = sentences.slice(0, 3).join(" ");

  if (mode === "general" || bookTitle === "Asistente Docente") {
    return `Puedo ayudarte con planificación y seguimiento. Dime el objetivo de la clase y el nivel del grupo, y te propongo una actividad, una evaluación breve y un criterio de logro.`;
  }

  if (excerpt) {
    return `Según la página ${pageNum} de "${bookTitle}", esto se relaciona con: ${excerpt} Si me dices qué parte te confunde, te lo explico paso a paso.`;
  }
  return `Estoy listo para ayudarte con "${bookTitle}". Intenta pasar de página o volver a abrir el libro y pregunta otra vez.`;
}
