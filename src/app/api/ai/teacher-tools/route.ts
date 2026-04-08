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
      return `📋 PLAN DE CLASE EDUCATIVO (Plantilla Automática)
======================================================
📚 Tema de la clase: ${input.topic || "Sin especificar"}
🎓 Nivel / Grado: ${input.grade || "General"}
⏱️ Duración estimada: ${input.duration || "45 minutos"}
📖 Referencia sugerida: ${input.bookTitle || "Ninguna"}

🎯 OBJETIVOS DE APRENDIZAJE:
1. Comprender los conceptos fundamentales sobre "${input.topic || "tema planteado"}".
2. Fomentar el pensamiento crítico y la participación activa del aula.
3. Aplicar el conocimiento adquirido mediante una actividad integradora.

--- ESTRUCTURA SUGERIDA DE LA CLASE ---

⏱️ FASE 1: INICIO Y MOTIVACIÓN (10 minutos)
• Saludo y activación de conocimientos previos.
• Pregunta disparadora: "¿Qué sabemos nosotros actualmente sobre ${input.topic || "este tema"}?"
• Breve introducción teórica asegurando la atención del grupo.

⏱️ FASE 2: DESARROLLO Y LECTURA (25 minutos)
• Lectura guiada profunda. Si se cuenta con la referencia "${input.bookTitle || "bibliográfica"}", solicitar a los estudiantes revisar el capítulo pertinente.
• Debate controlado: Dividir a la clase en grupos pequeños para comentar los puntos clave.
• Planteamiento de casos prácticos donde los alumnos deban resolver un escenario aplicando lo aprendido.

⏱️ FASE 3: CIERRE Y EVALUACIÓN FORMATIVA (10 minutos)
• Puesta en común: Un representante de cada grupo comparte sus conclusiones.
• Rueda de preguntas y respuestas rápidas para validar el objetivo.
• Asignación de tarea o lectura complementaria en la plataforma Leyópolis.

📌 NOTA PEDAGÓGICA PARA EL DOCENTE:
Esta es una estructura universal recomendada por expertos en metodologías activas (como Aprendizaje Basado en Proyectos y Aula Invertida).
*(La generación predictiva de IA se encuentra pausada por actualización técnica temporal del servidor, pero esta plantilla es completamente funcional y adaptada).*`;

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
      return `📝 GENERACIÓN Y ESTRUCTURA DE LECTURA (Esquema Docente)
======================================================
Tema seleccionado: ${input.topic || "General"}
Tipo de material: ${input.type || "Comprensión Lectora"}
Nivel de dificultad: ${input.level || "Intermedio"}

💡 SUGERENCIA DE REDACCIÓN ESTRUCTURAL:
Mientras nuestro motor inteligente es restablecido, le sugerimos estructurar su texto para la evaluación de la siguiente manera:

--- PÁRRAFO 1: INTRODUCCIÓN (Enganche) ---
Redacte 3 líneas iniciales que presenten una problemática o un hecho interesante alrededor de "${input.topic || "su tema"}". El objetivo aquí es "atrapar" al lector.

--- PÁRRAFOS 2-3: NÚCLEO INFORMATIVO ---
Desglose los detalles más vitales. Si el nivel requerido es "${input.level || "avanzado"}", asegúrese de usar un vocabulario exigente.
• Agregue datos específicos.
• Use una estructura de puntos cardinales.

--- PÁRRAFO 4: CONCLUSIÓN DEBATE ---
Finalice con un remate conciso o una pregunta argumentativa para que el alumno aplique Comprensión Lectora Crítica tras terminar el texto.`;

    default:
      return "⚠️ Herramienta de IA no reconocida o en mantenimiento.";
  }
}



