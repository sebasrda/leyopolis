
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
    
    // Check content length if available
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 15 * 1024 * 1024) { // 15MB limit as a safe guard
      return NextResponse.json({ message: "El archivo es demasiado grande (máximo 15MB)" }, { status: 413 });
    }

    let book;
    let title = "";
    let author = "Autor Desconocido";
    let category = "General";
    let difficulty = "Intermedio";
    let ageRange = null;
    let grade = null;
    let subject = null;
    let quizFile: File | null = null;
    const description = "Libro subido por el administrador";

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
      let formData;
      try {
        formData = await req.formData();
      } catch (err) {
        console.error("Error parsing form data:", err);
        return NextResponse.json({ message: "Error al procesar el formulario. Posiblemente el archivo es muy grande." }, { status: 400 });
      }

      const file = formData.get("file") as File;
      const cover = formData.get("cover") as File;
      title = formData.get("title") as string || file?.name?.replace(".pdf", "") || "Sin título";
      author = formData.get("author") as string || "Autor Desconocido";
      category = formData.get("category") as string || "General";
      difficulty = formData.get("difficulty") as string || "Intermedio";
      ageRange = formData.get("ageRange") as string || null;
      grade = formData.get("grade") as string || null;
      subject = formData.get("subject") as string || null;
      quizFile = formData.get("quizFile") as File | null;

      if (!file) return NextResponse.json({ message: "Archivo PDF requerido" }, { status: 400 });

      // Secondary size check for the file itself
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ message: "El PDF es demasiado grande (máximo 10MB)" }, { status: 413 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueName = `${Date.now()}-${file.name.replaceAll(" ", "_")}`;
      
      let contentUrl = "";
      let coverUrl = "https://placehold.co/400x600?text=PDF";

      try {
        if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
          const { put } = await import("@vercel/blob");
          const pdfRes = await put(`books/${uniqueName}`, buffer, { access: "public", contentType: "application/pdf" });
          contentUrl = pdfRes.url;
          if (cover && cover.size > 0) {
            const coverRes = await put(`covers/${Date.now()}-${cover.name}`, Buffer.from(await cover.arrayBuffer()), { access: "public" });
            coverUrl = coverRes.url;
          }
        } else {
          // Local storage - fallback
          const booksDir = path.join(process.cwd(), "public", "books");
          const publicPath = path.join(booksDir, uniqueName);
          await writeFile(publicPath, buffer);
          contentUrl = `/books/${uniqueName}`;
          if (cover && cover.size > 0) {
            const coverName = `cover-${uniqueName}-${cover.name}`;
            await writeFile(path.join(booksDir, coverName), Buffer.from(await cover.arrayBuffer()));
            coverUrl = `/books/${coverName}`;
          }
        }
      } catch (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        return NextResponse.json({ message: "Error al guardar archivos en el servidor", error: String(uploadErr) }, { status: 500 });
      }

      try {
        book = await (prisma as any).book.create({
          data: {
            title, author, category, difficulty, ageRange, grade, subject,
            language: "Español", format: "PDF", contentUrl,
            coverImage: coverUrl, description
          }
        });
      } catch (dbErr) {
        console.error("Database error creating book:", dbErr);
        return NextResponse.json({ message: "Error al registrar el libro en la base de datos", error: String(dbErr) }, { status: 500 });
      }
    }

    // AI Quiz & Games Generation - isolated in try-catch to not fail the whole upload
    try {
      if (!book) throw new Error("No book object available for AI generation");
      
      let rawText = "";
      let finalJsonString = "";
      let quizFromFile = false;

      // Stage 1: Text extraction from manual quiz file
      if (quizFile && quizFile.size > 0) {
        try {
          if (quizFile.name.endsWith(".json")) {
            finalJsonString = await quizFile.text();
            quizFromFile = true;
          } else {
            const quizBuffer = Buffer.from(await quizFile.arrayBuffer());
            if (quizFile.name.endsWith(".pdf")) {
              const pdfParse = require("pdf-parse");
              const data = await pdfParse(quizBuffer);
              rawText = data.text;
              quizFromFile = true;
            } else if (quizFile.name.endsWith(".docx") || quizFile.name.endsWith(".doc")) {
              const mammoth = require("mammoth");
              const result = await mammoth.extractRawText({ buffer: quizBuffer });
              rawText = result.value;
              quizFromFile = true;
            }
          }
        } catch (extractErr) {
          console.error("Text extraction error from quiz file:", extractErr);
        }
      }

      // Stage 2: AI Generation
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
      
      if (!finalJsonString && apiKey) {
        try {
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(apiKey);
          const aiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          
          let prompt = "";
          if (quizFromFile && rawText) {
            prompt = `Analiza el siguiente texto de un examen/quiz y conviértelo a JSON.
Libro: "${title}".
EXTRAE las preguntas TAL CUAL están en el documento y formátalas en este esquema JSON:
{
  "questions": [{"id": 1, "question": "pregunta textual", "options": ["A", "B", "C", "D"], "correctAnswer": 0}],
  "keywords": ["PALABRA1", "PALABRA2"],
  "memoryPairs": [{"character": "Nombre", "description": "Relación"}],
  "sentences": [{"id": 1, "sentence": "Frase importante"}]
}
Responde SOLO con JSON válido.
TEXTO: ${rawText.slice(0, 6000)}`;
          } else {
            prompt = `Genera un JSON educativo para el libro "${title}" de "${author}".
Esquema: { "questions": [...], "keywords": [...], "memoryPairs": [...], "sentences": [...] }.
Genera 10 preguntas, 10 palabras clave, 6 parejas de memoria y 5 frases. Responde SOLO con JSON válido.`;
          }

          const result = await aiModel.generateContent(prompt);
          const responseText = result.response.text();
          // Improved JSON extraction
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          finalJsonString = jsonMatch ? jsonMatch[0] : responseText;
        } catch (aiErr: any) {
          console.error("Gemini API Error during upload:", aiErr.message);
        }
      }
      
      // Fallback if still empty
      if (!finalJsonString) {
        const fallbackJson = {
          questions: [{ id: 1, question: `¿De qué trata el libro "${title}"?`, options: ["Varias temáticas", "No se especifica", "Ficción", "Realidad"], correctAnswer: 0 }],
          keywords: ["LECTURA", "LIBRO", "EDUCACION"],
          memoryPairs: [{ character: "Protagonista", description: "Personaje principal" }],
          sentences: [{ id: 1, sentence: "La lectura enriquece el alma." }]
        };
        finalJsonString = JSON.stringify(fallbackJson);
      }

      // Stage 3: Database Persistence for Activities
      if (finalJsonString) {
        let parsedQuiz;
        try {
          parsedQuiz = JSON.parse(finalJsonString);
        } catch (pErr) {
          console.error("JSON parse error for AI response:", pErr);
          throw pErr;
        }
        
        const quiz = await (prisma as any).activity.create({
          data: {
            title: `Quiz: ${title}`,
            description: quizFromFile ? `Examen para "${title}"` : `Quiz generado por IA para "${title}"`,
            type: "QUIZ",
            content: JSON.stringify(parsedQuiz),
            points: 100,
            published: true,
            createdById: session.user.id,
            bookId: book.id,
          },
        });
        await (prisma as any).book.update({ where: { id: book.id }, data: { quizId: quiz.id } });

        // Games
        if (parsedQuiz.keywords?.length > 0) {
          await (prisma as any).activity.create({
            data: {
              title: `Sopa de letras: ${title}`, type: "WORDSEARCH", 
              content: JSON.stringify({ words: parsedQuiz.keywords.slice(0, 10), gridSize: 12 }),
              points: 50, published: true, createdById: session.user.id, bookId: book.id,
            },
          });
        }
        if (parsedQuiz.memoryPairs?.length > 0) {
          await (prisma as any).activity.create({
            data: {
              title: `Memoria: ${title}`, type: "MATCH",
              content: JSON.stringify({ pairs: parsedQuiz.memoryPairs.map((p: any, i: number) => ({ id: i+1, word: p.character, def: p.description })) }),
              points: 50, published: true, createdById: session.user.id, bookId: book.id,
            },
          });
        }
        if (parsedQuiz.sentences?.length > 0) {
          await (prisma as any).activity.create({
            data: {
              title: `Ordenar: ${title}`, type: "REORDER", content: JSON.stringify({ sentences: parsedQuiz.sentences }),
              points: 50, published: true, createdById: session.user.id, bookId: book.id,
            },
          });
        }
      }
    } catch (innerErr) {
      console.error("Non-critical error in AI/Activity generation:", innerErr);
      // We don't return here, we want to return the book success
    }

    return NextResponse.json({ message: "Libro subido exitosamente", book });
  } catch (error) {
    console.error("Global upload error:", error);
    return NextResponse.json({ message: "Error crítico al procesar subida", error: String(error) }, { status: 500 });
  }
}



