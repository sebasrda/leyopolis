
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, appendFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const log = (msg: string) => appendFile("upload-debug.log", `[${new Date().toISOString()}] ${msg}\n`).catch(() => {});
  await log("Iniciando POST /api/upload");
  
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  await log(`Usuario: ${session?.user?.email}, Rol: ${userRole}`);
  
  const allowedRoles = ["ADMIN", "COORDINATOR", "SUPERADMIN"];
  
  if (!session?.user || !allowedRoles.includes(userRole)) {
    return NextResponse.json({ message: "No autorizado para subir libros" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    
    let book;
    let title = "";
    let author = "Autor Desconocido";
    let category = "General";
    let difficulty = "Intermedio";
    let ageRange = null;
    let grade = null;
    let subject = null;
    let quizFile: File | null = null;
    let description = "Libro subido por el administrador";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      title = body.title || "Libro";
      author = body.author || "Autor Desconocido";
      category = body.category || "General";
      difficulty = body.difficulty || "Intermedio";
      ageRange = body.ageRange || null;
      const contentUrl = body.contentUrl || "";
      const coverImage = body.coverImage || "https://placehold.co/400x600?text=PDF";

      book = await (prisma as any).book.create({
        data: {
          title, author, category, difficulty, ageRange,
          language: "Español", format: "PDF", contentUrl,
          coverImage, description
        }
      });
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const cover = formData.get("cover") as File;
      title = formData.get("title") as string || file.name.replace(".pdf", "");
      author = formData.get("author") as string || "Autor Desconocido";
      category = formData.get("category") as string || "General";
      difficulty = formData.get("difficulty") as string || "Intermedio";
      ageRange = formData.get("ageRange") as string || null;
      grade = formData.get("grade") as string || null;
      subject = formData.get("subject") as string || null;
      quizFile = formData.get("quizFile") as File | null;

      if (!file) return NextResponse.json({ message: "Archivo PDF requerido" }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueName = `${Date.now()}-${file.name.replaceAll(" ", "_")}`;
      
      let contentUrl = "";
      let coverUrl = "https://placehold.co/400x600?text=PDF";

      if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import("@vercel/blob");
        const pdfRes = await put(`books/${uniqueName}`, buffer, { access: "public", contentType: "application/pdf" });
        contentUrl = pdfRes.url;
        if (cover) {
          const coverRes = await put(`covers/${Date.now()}-${cover.name}`, Buffer.from(await cover.arrayBuffer()), { access: "public" });
          coverUrl = coverRes.url;
        }
      } else {
        const publicPath = path.join(process.cwd(), "public", "books", uniqueName);
        await writeFile(publicPath, buffer);
        contentUrl = `/books/${uniqueName}`;
        if (cover) {
          const coverName = `cover-${uniqueName}-${cover.name}`;
          await writeFile(path.join(process.cwd(), "public", "books", coverName), Buffer.from(await cover.arrayBuffer()));
          coverUrl = `/books/${coverName}`;
        }
      }

      book = await (prisma as any).book.create({
        data: {
          title, author, category, difficulty, ageRange, grade, subject,
          language: "Español", format: "PDF", contentUrl,
          coverImage: coverUrl, description
        }
      });
    }

    // AI Quiz & Games Generation
    try {
      let rawText = "";
      let finalJsonString = "";
      let quizFromFile = false;

      // Step 1: Extract text from uploaded quiz file (if any)
      if (quizFile && quizFile.size > 0) {
        if (quizFile.name.endsWith(".json")) {
          finalJsonString = await quizFile.text();
          quizFromFile = true;
        } else {
          const quizBuffer = Buffer.from(await quizFile.arrayBuffer());
          if (quizFile.name.endsWith(".pdf")) {
            try {
              const pdfParse = require("pdf-parse");
              rawText = (await pdfParse(quizBuffer)).text;
              quizFromFile = true;
            } catch (e) { console.error("PDF parse error:", e); }
          } else if (quizFile.name.endsWith(".docx") || quizFile.name.endsWith(".doc")) {
            try {
              const mammoth = require("mammoth");
              rawText = (await mammoth.extractRawText({ buffer: quizBuffer })).value;
              quizFromFile = true;
            } catch (e) { console.error("DOCX parse error:", e); }
          }
        }
      }

      // Step 2: Use AI to convert to JSON or generate from scratch
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
      
      if (!finalJsonString && apiKey) {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const aiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        let prompt = "";
        
        if (quizFromFile && rawText) {
          // CASE A: Quiz file uploaded — extract questions from the document
          prompt = `Analiza el siguiente texto de un examen/quiz y conviértelo a JSON.
El texto proviene de un archivo subido por un profesor como evaluación del libro "${title}".
EXTRAE las preguntas TAL CUAL están en el documento y formátalas en este esquema JSON:
{
  "questions": [{"id": 1, "question": "pregunta textual del documento", "options": ["opción A", "opción B", "opción C", "opción D"], "correctAnswer": 0}],
  "keywords": ["PALABRA1", "PALABRA2"],
  "memoryPairs": [{"character": "Nombre", "description": "Relación"}],
  "sentences": [{"id": 1, "sentence": "Frase importante"}]
}
Si las preguntas no tienen opciones, inventa 4 opciones para cada una con 1 correcta.
También genera 8 palabras clave, 6 parejas de memoria y 5 frases basadas en el contenido.
Responde SOLO con JSON válido, sin markdown.

TEXTO DEL EXAMEN:
"""
${rawText.slice(0, 8000)}
"""`;
        } else {
          // CASE B: No quiz file — generate from scratch based on book title
          prompt = `Genera un JSON educativo completo para el libro "${title}" del autor "${author}".
Esquema EXACTO (sin markdown, solo JSON puro):
{
  "questions": [{"id": 1, "question": "Pregunta de comprensión", "options": ["A", "B", "C", "D"], "correctAnswer": 0}],
  "keywords": ["PALABRA1", "PALABRA2"],
  "memoryPairs": [{"character": "Nombre", "description": "Descripción"}],
  "sentences": [{"id": 1, "sentence": "Frase del libro para ordenar"}]
}
Genera 10 preguntas variadas de comprensión lectora, 10 palabras clave en MAYÚSCULAS, 6 parejas personaje-descripción y 5 frases. Las preguntas deben ser coherentes con la trama real del libro. Responde SOLO con JSON válido.`;
        }

        const result = await aiModel.generateContent(prompt);
        finalJsonString = result.response.text().replace(/```json|```/g, "").trim();
      }

      // Step 3: Save quiz and games to database
      if (finalJsonString) {
        const parsedQuiz = JSON.parse(finalJsonString);
        
        // Create Quiz Activity and link to book
        const quiz = await (prisma as any).activity.create({
          data: {
            title: `Quiz: ${title}`,
            description: quizFromFile ? `Examen del profesor para "${title}"` : `Quiz generado por IA para "${title}"`,
            type: "QUIZ",
            content: JSON.stringify(parsedQuiz),
            points: 100,
            published: true,
            createdById: session.user.id,
            bookId: book.id,
          },
        });
        await (prisma as any).book.update({ where: { id: book.id }, data: { quizId: quiz.id } });

        // Create game activities (wordsearch, memory, reorder)
        if (parsedQuiz.keywords && parsedQuiz.keywords.length > 0) {
          await (prisma as any).activity.create({
            data: {
              title: `Sopa de letras: ${title}`, description: `Palabras clave de "${title}"`,
              type: "WORDSEARCH", content: JSON.stringify({ words: parsedQuiz.keywords.slice(0, 10), gridSize: 12 }),
              points: 50, published: true, createdById: session.user.id, bookId: book.id,
            },
          });
        }
        if (parsedQuiz.memoryPairs && parsedQuiz.memoryPairs.length > 0) {
          await (prisma as any).activity.create({
            data: {
              title: `Memoria: ${title}`, description: `Personajes de "${title}"`,
              type: "MATCH", content: JSON.stringify({ pairs: parsedQuiz.memoryPairs.map((p: any, i: number) => ({ id: i+1, word: p.character, def: p.description })) }),
              points: 50, published: true, createdById: session.user.id, bookId: book.id,
            },
          });
        }
        if (parsedQuiz.sentences && parsedQuiz.sentences.length > 0) {
          await (prisma as any).activity.create({
            data: {
              title: `Ordenar: ${title}`, description: `Eventos de "${title}"`,
              type: "REORDER", content: JSON.stringify({ sentences: parsedQuiz.sentences }),
              points: 50, published: true, createdById: session.user.id, bookId: book.id,
            },
          });
        }
      }
    } catch (aiErr) {
      console.error("AI/Quiz Error:", aiErr);
    }

    return NextResponse.json({ message: "Libro subido exitosamente", book });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Error al procesar subida", error: String(error) }, { status: 500 });
  }
}



