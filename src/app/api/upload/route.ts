
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
  
  const allowedRoles = ["ADMIN", "COORDINATOR"]; // Only admin and coordinator can upload books
  
  if (!session?.user || !allowedRoles.includes(userRole)) {
    console.error("Unauthorized upload attempt:", session?.user?.email, "Role:", userRole);
    return NextResponse.json({ message: "No autorizado para subir libros" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    await log(`ContentType: ${contentType}`);
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      const title = typeof body.title === "string" ? body.title : "";
      const author = typeof body.author === "string" ? body.author : "Autor Desconocido";
      const category = typeof body.category === "string" ? body.category : "General";
      const difficulty = typeof body.difficulty === "string" ? body.difficulty : "Intermedio";
      const ageRange = typeof body.ageRange === "string" ? body.ageRange : null;
      const contentUrl = typeof body.contentUrl === "string" ? body.contentUrl : "";
      const coverImage = typeof body.coverImage === "string" ? body.coverImage : null;

      if (!contentUrl) {
        return NextResponse.json({ message: "contentUrl requerido" }, { status: 400 });
      }

      const book = await (prisma as any).book.create({
        data: {
          title: title || "Libro",
          author,
          category,
          difficulty,
          ageRange,
          language: "Español",
          format: "PDF",
          contentUrl,
          coverImage: coverImage || "https://placehold.co/400x600?text=PDF",
          description: "Libro subido por el administrador",
        },
      });

      return NextResponse.json({ message: "Libro subido exitosamente", book });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const cover = formData.get("cover") as File;
    const title = formData.get("title") as string;
    const author = formData.get("author") as string || "Autor Desconocido";
    const category = formData.get("category") as string || "General";
    const difficulty = formData.get("difficulty") as string || "Intermedio";
    const ageRange = formData.get("ageRange") as string || null;
    const grade = formData.get("grade") as string || null;
    const subject = formData.get("subject") as string || null;
    const quizFile = formData.get("quizFile") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No se ha proporcionado ningún archivo PDF" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeOriginalName = file.name.replaceAll(" ", "_");
    const uniquePrefix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filename = `${uniquePrefix}-${safeOriginalName}`;

    let contentUrl = "";
    let coverUrl = "https://placehold.co/400x600?text=PDF";

    const canUseBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
    const isVercel = !!process.env.VERCEL;

    if (isVercel && canUseBlob) {
      const mod = (await import("@vercel/blob").catch(() => null)) as any;
      const put = mod?.put as undefined | ((name: string, data: Blob | Buffer, opts: { access: "public"; contentType?: string }) => Promise<{ url: string }>);
      if (!put) {
        return NextResponse.json(
          { message: "Falta dependencia @vercel/blob en el deployment." },
          { status: 500 }
        );
      }

      const pdfRes = await put(`books/${filename}`, buffer, { access: "public", contentType: "application/pdf" });
      contentUrl = pdfRes.url;

      if (cover) {
        const coverBuffer = Buffer.from(await cover.arrayBuffer());
        const coverFilename = `${uniquePrefix}-cover-${cover.name.replaceAll(" ", "_")}`;
        const coverRes = await put(`books/${coverFilename}`, coverBuffer, { access: "public" });
        coverUrl = coverRes.url;
      }
    } else if (isVercel && !canUseBlob) {
      return NextResponse.json(
        {
          message:
            "En Vercel no se puede guardar archivos en /public. Configura storage persistente: crea Vercel Blob y define BLOB_READ_WRITE_TOKEN en Environment Variables.",
        },
        { status: 500 }
      );
    } else {
      // Local dev: store under /public/books
      const publicPath = path.join(process.cwd(), "public", "books", filename);
      await writeFile(publicPath, buffer);
      contentUrl = `/books/${filename}`;

      if (cover) {
        const coverBuffer = Buffer.from(await cover.arrayBuffer());
        const coverFilename = `${uniquePrefix}-cover-${cover.name.replaceAll(" ", "_")}`;
        const coverPath = path.join(process.cwd(), "public", "books", coverFilename);
        await writeFile(coverPath, coverBuffer);
        coverUrl = `/books/${coverFilename}`;
      }
    }
    
    // Create DB entry
    const book = await (prisma as any).book.create({
      data: {
        title: title || file.name.replace(".pdf", ""),
        author,
        category,
        difficulty,
        ageRange,
        grade,
        subject,
        language: "Español", // Default
        format: "PDF",
        contentUrl,
        coverImage: coverUrl,
        description: "Libro subido por el administrador"
      }
    });

    // Manejar Quiz File
    if (quizFile) {
      try {
        let finalJsonString = "";

        if (quizFile.name.endsWith(".json") || quizFile.type === "application/json") {
          finalJsonString = await quizFile.text();
        } else {
          // Extraer texto de PDF o Word
          const quizBuffer = Buffer.from(await quizFile.arrayBuffer());
          let rawText = "";

          if (quizFile.name.endsWith(".pdf")) {
            const pdfParse = require("pdf-parse");
            const data = await pdfParse(quizBuffer);
            rawText = data.text;
          } else if (quizFile.name.endsWith(".docx") || quizFile.type.includes("word")) {
            const mammoth = require("mammoth");
            const data = await mammoth.extractRawText({ buffer: quizBuffer });
            rawText = data.value;
          }

          if (rawText && rawText.trim() !== "") {
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ 
              model: "gemini-1.5-flash",
              generationConfig: { responseMimeType: "application/json" }
            });
            const prompt = `Convierte este examen crudo en un JSON estricto con el esquema: {"questions": [{"id": 1, "question": "...", "options": ["A", "B", "C"], "correctAnswer": 0}]}. Si es pregunta abierta sin opciones, omite 'options' y 'correctAnswer' y pon 'answer': "Respuesta Sugerida". Solo devuelve el JSON válido. Texto del examen: ${rawText}`;
            const result = await model.generateContent(prompt);
            finalJsonString = result.response.text();
          }
        }

        if (finalJsonString) {
          const parsedQuiz = JSON.parse(finalJsonString);
          const quiz = await (prisma as any).activity.create({
            data: {
              title: `Quiz: ${book.title}`,
              description: `Quiz de comprensión para "${book.title}" generado desde ${quizFile.name}`,
              type: "QUIZ",
              content: JSON.stringify(parsedQuiz),
              points: 100,
              published: true,
              createdById: session.user.id,
              bookId: book.id,
            },
          });
          
          await (prisma as any).book.update({
            where: { id: book.id },
            data: { quizId: quiz.id }
          });
        }
      } catch (err) {
        console.error("Failed to parse or save quiz file during upload", err);
      }
    }

    return NextResponse.json({ 
      message: "Libro subido exitosamente", 
      book 
    });
    
  } catch (error) {
    await log(`ERROR: ${error instanceof Error ? error.stack : String(error)}`);
    console.error("Error al subir libro:", error);
    return NextResponse.json(
      { message: "Error interno del servidor al procesar el archivo", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
