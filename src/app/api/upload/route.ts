
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

      if (quizFile) {
        if (quizFile.name.endsWith(".json")) {
          finalJsonString = await quizFile.text();
        } else {
          const quizBuffer = Buffer.from(await quizFile.arrayBuffer());
          if (quizFile.name.endsWith(".pdf")) {
            const pdfParse = require("pdf-parse");
            rawText = (await pdfParse(quizBuffer)).text;
          } else if (quizFile.name.endsWith(".docx")) {
            const mammoth = require("mammoth");
            rawText = (await mammoth.extractRawText({ buffer: quizBuffer })).value;
          }
        }
      }

      if (!finalJsonString) {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
        
        const prompt = `Genera un JSON educativo para el libro "${title}". 
        Contexto opcional: ${rawText || description}.
        Esquema:
        {
          "questions": [{"id": 1, "question": "...", "options": ["A", "B", "C"], "correctAnswer": 0}],
          "keywords": ["PALABRA1", "PALABRA2", "PALABRA3"], 
          "memoryPairs": [{"character": "Nombre", "description": "Relación/Rol"}],
          "sentences": [{"id": 1, "sentence": "Frase importante para ordenar"}]
        }
        Genera 10 preguntas, 10 palabras clave, 6 parejas de memoria y 5 frases. No uses markdown, solo el JSON.`;

        const result = await aiModel.generateContent(prompt);
        finalJsonString = result.response.text().replace(/```json|```/g, "").trim();
      }

      if (finalJsonString) {
        const parsedQuiz = JSON.parse(finalJsonString);
        const quiz = await (prisma as any).activity.create({
          data: {
            title: `Quiz: ${title}`,
            description: `Actividades para "${title}"`,
            type: "QUIZ",
            content: JSON.stringify(parsedQuiz),
            points: 100,
            published: true,
            createdById: session.user.id,
            bookId: book.id,
          },
        });
        await (prisma as any).book.update({ where: { id: book.id }, data: { quizId: quiz.id } });
      }
    } catch (aiErr) {
      console.error("AI Error:", aiErr);
    }

    return NextResponse.json({ message: "Libro subido exitosamente", book });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Error al procesar subida", error: String(error) }, { status: 500 });
  }
}



