import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";

function fallbackActivity(prompt: string) {
  const base = prompt.trim() || "Lectura";
  return {
    title: `Actividad: ${base.slice(0, 60)}`,
    description: "Actividad generada en modo degradado (sin IA disponible).",
    type: "QUIZ",
    points: 100,
    content: {
      questions: [
        {
          id: 1,
          question: `¿Cuál es la idea principal del tema "${base}"?`,
          options: ["Opción A", "Opción B", "Opción C", "Opción D"],
          correctAnswer: 0,
        },
        {
          id: 2,
          question: "Selecciona la afirmación verdadera según el contenido.",
          options: ["Verdadera", "Falsa", "No se puede determinar", "No aplica"],
          correctAnswer: 0,
        },
        {
          id: 3,
          question: "¿Qué detalle apoya mejor la conclusión?",
          options: ["Detalle 1", "Detalle 2", "Detalle 3", "Detalle 4"],
          correctAnswer: 1,
        },
        {
          id: 4,
          question: "¿Cuál sería el mejor título alternativo?",
          options: ["Título 1", "Título 2", "Título 3", "Título 4"],
          correctAnswer: 2,
        },
        {
          id: 5,
          question: "¿Qué concepto clave aparece con mayor relevancia?",
          options: ["Concepto A", "Concepto B", "Concepto C", "Concepto D"],
          correctAnswer: 0,
        },
      ],
    },
  };
}

export async function POST(req: Request) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "COORDINATOR") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) return NextResponse.json({ message: "Prompt required" }, { status: 400 });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json(fallbackActivity(prompt));

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest", "gemini-1.5-pro"];

    let jsonText = "";

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(
          `Crea una actividad educativa tipo Moodle para una plataforma de lectura.
Devuelve SOLO JSON válido, sin markdown.
Formato:
{
  "title": string,
  "description": string,
  "type": "QUIZ",
  "points": number,
  "content": { "questions": [ { "id": number, "question": string, "options": string[4], "correctAnswer": number } ] }
}
La actividad debe tener 8 preguntas.
Prompt del profesor: ${prompt}`
        );

        jsonText = result.response.text().trim();
        if (jsonText) break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("[429") || msg.toLowerCase().includes("quota")) break;
      }
    }

    const parsed = JSON.parse(jsonText) as unknown;
    if (!parsed || typeof parsed !== "object") return NextResponse.json(fallbackActivity(prompt));
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(fallbackActivity(prompt));
  }
}
