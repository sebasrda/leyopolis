import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

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

  // ── Rate limit: 20 teacher-tools calls per minute per user ──
  const userId = (session.user as any).id || "anon";
  const ip = clientIp(req.headers);
  const rl = await rateLimit(`tt:${userId}:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return tooManyRequestsResponse(rl, "Demasiadas consultas a herramientas IA. Espera unos segundos.");
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
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

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
      return `Eres un experto pedagógico altamente innovador. Genera un plan de clase DETALLADO y CREATIVO en español usando Markdown:
Tema: ${input.topic || "No especificado"}
Grado/Nivel: ${input.grade || "No especificado"}
Duración: ${input.duration || "45 minutos"}
Libro de referencia: ${input.bookTitle || "No especificado"}

Instrucciones Críticas:
1. NO uses texto genérico sin sentido. Hazlo extremadamente útil y aplicable para el aula de hoy.
2. Crea dinámicas altamente interactivas, como debates, uso de aula invertida o aprendizaje basado en retos.
3. Formatea con títulos claros, listas y viñetas (Markdown) para: Objetivo, Materiales Disruptivos, Inicio (Enganche), Desarrollo (El Reto), Cierre y Evaluación Formativa.`;

    case "dictionary":
      return `Eres un diccionario educativo en español. Define el siguiente término de forma clara y pedagógica, apropiada para estudiantes:
Término: "${input.term || ""}"
Contexto educativo: ${input.context || "General"}

Incluye: Definición clara, ejemplo de uso, sinónimos si aplica. Responde en español.`;

    case "text-generator":
      return `Eres un creador de contenido dinámico para el aula. Genera una lectura/texto escolar muy interesante en español:
Tema: ${input.topic || "No especificado"}
Tipo: ${input.type || "Lectura corta"}
Nivel: ${input.level || "Intermedio"}

Instrucciones Críticas:
1. El texto debe atrapar al estudiante desde la primera línea. Usa narrativa inmersiva y datos curiosos.
2. Incluye subtítulos, pausas de reflexión (preguntas abiertas incrustadas) dentro del texto.
3. Formatea el texto con Markdown limpio. Debe estar listo para llevar al salón de clases y usarse hoy mismo.`;

    default:
      return `Responde en español como asistente educativo: ${input.query || ""}`;
  }
}

function getFallbackResult(tool: string, input: any): string {
  switch (tool) {
    case "lesson-planner":
      return `🚀 **PLAN DE AULA 360° E INTERACTIVO**
======================================================
**🌟 Asignatura/Tema:** ${input.topic || "Exploración Creativa"}
**🎯 Nivel:** ${input.grade || "Aula General"}
**⏱️ Tiempo:** ${input.duration || "45 minutos"}
**📖 Recurso Ancla:** ${input.bookTitle || "Material asignado"}

🎯 **MISIONES DE APRENDIZAJE**
1. Que los estudiantes no solo memoricen, sino que **apliquen** los principios de *${input.topic || "la temática"}* en un caso real.
2. Despertar el sentido crítico mediante el **"Aprendizaje Invertido" (Flipped Classroom)**.
3. Generar una chispa de curiosidad que vaya más allá del aula.

--- ⚡ CRONOGRAMA DE GESTIÓN DINÁMICA ---

⏱️ **FASE 1: EL GANCHO (El Rompehielo) (10 min)**
• **Dinámica:** La Pregunta Imposible.
• **Acción:** Entra al salón y anota en el pizarrón: *"¿Qué pasaría si el mundo funcionara sin ${input.topic || "este concepto"}?"*. No respondas. Deja que ellos discutan en parejas por 3 minutos antes de introducir formalmente la teoría.
• **Material Disruptivo:** Un objeto, imagen o noticia reciente (opcional) que esté directamente relacionada para captar atención visual.

⏱️ **FASE 2: LABORATORIO DE IDEAS (Aula Invertida) (25 min)**
• En lugar de dictar, divide al salón en 4 *"Escuadrones"*.
• **El Reto:** Si tienen el texto base ("*${input.bookTitle || "documento de referencia"}*"), pídeles que extraigan el argumento principal, no como resumen, sino como un reportaje de noticias urgente. 
• **Interactividad:** El profesor actúa únicamente como "Mentor". Camina por el salón haciendo preguntas difíciles a cada grupo, forzando la argumentación lógica.

⏱️ **FASE 3: EL DEBATE DE CIERRE (10 min)**
• Un representante por escuadrón presenta su postura/reportaje.
• **Cierre Reflexivo:** En lugar de una nota, haz una votación rápida (pulgares arriba o abajo) sobre un dilema moral o práctico que involucre el tema.
• **Misión para Casa:** Buscar 1 ejemplo sobre *${input.topic || "la temática"}* en su vida cotidiana para comentarlo la próxima sesión.

*(Este plan utiliza metodologías activas y gamificación para garantizar la atención total).*`;

    case "dictionary":
      return `📖 EXPLORACIÓN LÉXICA Y DICCIONARIO (Modo Plantilla)
======================================================
Término consultado: "${input.term || "Término no especificado"}"
Contexto: ${input.context || "Desarrollo general básico"}

📌 GUÍA DE EXPLICACIÓN PARA CLASE:
Para explicar el término "${input.term || "consultado"}" de manera altamente pedagógica a sus alumnos, siga esta estructura recomendada:

1. Definición Conceptual y Literal: Enuncie el significado oficial usando palabras en un nivel de comprensión amigable.
2. Origen / Contexto Histórico: Mencione brevemente de dónde proviene o en qué escenario ocurre comúnmente en la vida real.
3. Caso de Uso Moderno (Ejemplo): Formule una oración del día a día: "Si utilizamos el concepto de ${input.term || "esta palabra"} hoy...".
4. Pregunta de Contraste Reflexivo: Pida a sus alumnos que indiquen posibles sinónimos o antónimos para consolidar la retención mental.

*(El servicio de diccionario por IA se restablecerá próximamente).*`;

    case "text-generator":
      return `📜 **TEXTO INTERACTIVO: EXPLORANDO UN NUEVO MUNDO**
======================================================
> **📌 Para el estudiante:** *Lee con cuidado. Al final encontrarás un dilema que solo tú puedes resolver.*

**Tema:** ${input.topic || "Explorando lo desconocido..."}

Imagina que despiertas y descubres una realidad que nunca te habías planteado sobre *${input.topic || "nuestro tema principal"}*. Durante mucho tiempo, hemos creído entender cómo funciona el mundo, pero la verdad es mucho más sorprendente y profunda.

**🔍 Una Observación Curiosa:**
Históricamente, los mayores saltos en la humanidad comenzaron al cuestionar lo evidente. Al estudiar *${input.topic || "esta área"}*, los expertos descubrieron que no se trata solo de datos aburridos, sino de un mecanismo complejo que sostiene todo lo que nos rodea. Es como un motor invisible.

> **⏸️ PAUSA ACTIVA (¡Piensa!):**
> *Si tú pudieras cambiar una sola regla sobre cómo funciona esto en la vida real, ¿qué cambiarías y por qué? Discútelo internamente por 10 segundos antes de seguir leyendo.*

El impacto que esto tiene en la modernidad es innegable. Las personas que dominan y entienden este concepto son aquellas capaces de liderar los equipos del mañana, porque entienden las causas raíz de los problemas, en lugar de solo mirar los síntomas.

**💥 EL RETO FINAL (Para debatir en clase):**
Sabiendo todo esto, tu misión es construir un contra-argumento. Si alguien te dice que *${input.topic || "este tema"}* ya no es importante para la sociedad actual... ¿Qué evidencia de tu vida diaria usarías para demostrarle que está completamente equivocado?`;

    default:
      return "⚠️ Herramienta de IA no reconocida o en mantenimiento.";
  }
}



