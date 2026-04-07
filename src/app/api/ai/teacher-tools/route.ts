import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EDUCATIONAL_DISCLAIMER = "\n\n⚠️ Uso exclusivo educativo dentro del aula. No permitido para fines comerciales.";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "STUDENT") {
    return NextResponse.json({ message: "Acceso IA no disponible para estudiantes" }, { status: 403 });
  }

  if (role !== "TEACHER" && role !== "COORDINATOR" && role !== "ADMIN") {
    return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { tool, input } = await req.json();

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        result: getFallbackResult(tool, input),
        degraded: true,
        disclaimer: EDUCATIONAL_DISCLAIMER,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];

    let result = "";

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = getPrompt(tool, input);
        const response = await model.generateContent(prompt);
        result = response.response.text();
        if (result) break;
      } catch (err) {
        console.error(`Error with model ${modelName}:`, err);
      }
    }

    if (!result) {
      result = getFallbackResult(tool, input);
    }

    return NextResponse.json({
      result: result + EDUCATIONAL_DISCLAIMER,
      disclaimer: EDUCATIONAL_DISCLAIMER,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Teacher tools error:", error);
    return NextResponse.json({ message: "Error procesando solicitud" }, { status: 500 });
  }
}

function getPrompt(tool: string, input: any): string {
  switch (tool) {
    case "lesson-planner":
      return `Eres un asistente educativo experto. Genera un plan de clase detallado en español para:
Tema: ${input.topic || "No especificado"}
Grado/Nivel: ${input.grade || "No especificado"}
Duración: ${input.duration || "45 minutos"}
Libro de referencia: ${input.bookTitle || "No especificado"}

Incluye: Objetivo, materiales, actividades de inicio/desarrollo/cierre, evaluación.
Formato claro con viñetas. Responde en español.`;

    case "dictionary":
      return `Eres un diccionario educativo en español. Define el siguiente término de forma clara y pedagógica, apropiada para estudiantes:
Término: "${input.term || ""}"
Contexto educativo: ${input.context || "General"}

Incluye: Definición clara, ejemplo de uso, sinónimos si aplica. Responde en español.`;

    case "text-generator":
      return `Eres un generador de textos educativos en español. Genera un texto corto para una actividad en clase:
Tema: ${input.topic || "No especificado"}
Tipo: ${input.type || "Lectura corta"}
Nivel: ${input.level || "Intermedio"}
Extensión: ${input.length || "150-200 palabras"}

El texto debe ser educativo, apropiado para el nivel, y útil como material de clase. Responde en español.`;

    default:
      return `Responde en español como asistente educativo: ${input.query || ""}`;
  }
}

function getFallbackResult(tool: string, input: any): string {
  switch (tool) {
    case "lesson-planner":
      return `📋 Plan de Clase (modo sin conexión)\n\nTema: ${input.topic || "Por definir"}\n\n• Objetivo: Desarrollar comprensión del tema\n• Inicio (10 min): Activación de conocimientos previos\n• Desarrollo (25 min): Lectura guiada y análisis\n• Cierre (10 min): Puesta en común y evaluación formativa\n\nNota: Conecta la API de IA para planes más detallados.`;
    case "dictionary":
      return `📖 "${input.term || "término"}": Definición no disponible sin conexión IA. Consulta un diccionario educativo o activa la API.`;
    case "text-generator":
      return `📝 Generación de texto no disponible sin conexión IA. Intenta más tarde o usa textos de la biblioteca.`;
    default:
      return "Herramienta no reconocida.";
  }
}

