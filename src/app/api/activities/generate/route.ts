import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserIdAndRole } from "@/lib/access";
import { generateWithOpenRouter } from "@/lib/ai/openrouter";
import { generateWithOpenAI } from "@/lib/ai/openai";

export const dynamic = "force-dynamic";

function fallbackActivity(prompt: string) {
  const base = prompt.trim() || "Lectura";
  return {
    title: `Actividad: ${base.slice(0, 60)}`,
    description: "Actividad generada (Modo de Calidad Básica).",
    type: "QUIZ",
    points: 100,
    content: {
      questions: [
        {
          id: 1,
          question: `Analizando "${base}", ¿cuál crees que es el tema central que el autor intenta transmitir?`,
          options: ["El conflicto interno", "La superación personal", "La importancia del contexto", "El cambio social"],
          correctAnswer: 0,
        },
        {
          id: 2,
          question: "¿Qué elemento narrativo destaca más en este contenido?",
          options: ["La descripción de lugares", "El diálogo entre personajes", "El simbolismo", "La estructura cronológica"],
          correctAnswer: 2,
        },
        {
          id: 3,
          question: "¿Cómo impacta el inicio de la historia en el desarrollo posterior?",
          options: ["Establece el misterio", "Presenta al antagonista", "Define el tono de la obra", "Crea una falsa sensación de seguridad"],
          correctAnswer: 1,
        },
        {
          id: 4,
          question: "Si tuvieras que resumir la lección principal, ¿cuál elegirías?",
          options: ["La persistencia vence al talento", "El pasado siempre vuelve", "La unión hace la fuerza", "La verdad nos hace libres"],
          correctAnswer: 0,
        },
        {
          id: 5,
          question: "¿Qué recurso literario es predominante en el texto?",
          options: ["Metáfora", "Hipérbole", "Personificación", "Ironía"],
          correctAnswer: 3,
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
  const promptText = typeof body.prompt === "string" ? body.prompt : "";
  if (!promptText.trim()) return NextResponse.json({ message: "Prompt required" }, { status: 400 });

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

  const fullPrompt = `Crea una actividad educativa tipo Moodle para una plataforma de lectura.
Devuelve SOLO JSON válido, sin markdown.
Formato:
{
  "title": string,
  "description": string,
  "type": "QUIZ",
  "points": number,
  "content": { "questions": [ { "id": number, "question": string, "options": string[4], "correctAnswer": number } ] }
}
La actividad debe tener 8 preguntas inteligentes y desafiantes.
Prompt del profesor: ${promptText}`;

  let jsonText = "";

  // PRIMARY: Gemini
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
      
      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(fullPrompt);
          jsonText = result.response.text().trim();
          if (jsonText) break;
        } catch (e) {
          console.error(`[AI-GEN] Gemini ${modelName} failed:`, e);
        }
      }
    } catch (e) {
      console.error("[AI-GEN] Gemini Primary failed:", e);
    }
  }

  // SECONDARY: OpenRouter
  if (!jsonText && openrouterKey) {
    try {
      const result = await generateWithOpenRouter(fullPrompt, openrouterKey, "google/gemini-2.0-flash-001");
      if (result) jsonText = JSON.stringify(result);
    } catch (e) {
      console.error("[AI-GEN] OpenRouter Secondary failed:", e);
    }
  }

  // TERTIARY: OpenAI
  if (!jsonText && openaiKey) {
    try {
      const result = await generateWithOpenAI(fullPrompt, "gpt-4o-mini", openaiKey);
      if (result) jsonText = JSON.stringify(result);
    } catch (e) {
      console.error("[AI-GEN] OpenAI Tertiary failed:", e);
    }
  }

  try {
    if (!jsonText) return NextResponse.json(fallbackActivity(promptText));
    
    // Cleanup JSON from markdown if present
    const cleanJson = jsonText.match(/\{[\s\S]*\}/);
    const finalJson = cleanJson ? cleanJson[0] : jsonText;
    
    const parsed = JSON.parse(finalJson);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[AI-GEN] JSON Parse Error:", err);
    return NextResponse.json(fallbackActivity(promptText));
  }
}



