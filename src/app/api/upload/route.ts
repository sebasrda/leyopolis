
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, appendFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAndSaveActivities } from "@/lib/ai-activities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max allowed for Pro, ignored for Hobby (capped at 10s)

export async function POST(req: Request) {
  // Use /tmp for logging on Vercel
  const logPath = process.env.VERCEL ? "/tmp/upload-debug.log" : "upload-debug.log";
  const log = (msg: string) => appendFile(logPath, `[${new Date().toISOString()}] ${msg}\n`).catch(() => {});
  
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
    let rawText = "";
    let finalJsonString = "";
    let quizFromFile = false;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      title = body.title || "Libro";
      author = body.author || "Autor Desconocido";
      category = body.category || "General";
      difficulty = body.difficulty || "Intermedio";
      ageRange = body.ageRange || null;
      grade = body.grade || null;
      subject = body.subject || null;
      const contentUrl = body.contentUrl || "";
      const coverImage = body.coverImage || "https://placehold.co/400x600?text=PDF";
      const quizFileUrl = body.quizFileUrl || "";

      if (!contentUrl) {
        return NextResponse.json({ message: "URL de contenido requerida" }, { status: 400 });
      }

      try {
        book = await (prisma as any).book.create({
          data: {
            title, author, category, difficulty, ageRange, grade, subject,
            language: "Español", format: "PDF", contentUrl,
            coverImage, description
          }
        });

        // For AI generation, we need to fetch the PDF content if possible
        try {
          const pdfRes = await fetch(contentUrl);
          if (pdfRes.ok) {
            const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
            const pdfParse = require("pdf-parse");
            const data = await pdfParse(pdfBuffer);
            rawText = data.text;
          }
        } catch (fetchErr) {
          console.error("Error fetching PDF for AI text extraction:", fetchErr);
        }

        // If a manual quiz file was uploaded (PDF/Docx/JSON)
        if (quizFileUrl) {
          try {
            const qFileRes = await fetch(quizFileUrl);
            if (qFileRes.ok) {
              if (quizFileUrl.endsWith(".json")) {
                finalJsonString = await qFileRes.text();
                quizFromFile = true;
              } else {
                const qBuffer = Buffer.from(await qFileRes.arrayBuffer());
                if (quizFileUrl.endsWith(".pdf")) {
                   const pdfParse = require("pdf-parse");
                   const qData = await pdfParse(qBuffer);
                   rawText = qData.text; // Use this as source for AI
                   quizFromFile = true;
                } else if (quizFileUrl.endsWith(".docx") || quizFileUrl.endsWith(".doc")) {
                   const mammoth = require("mammoth");
                   const qResult = await mammoth.extractRawText({ buffer: qBuffer });
                   rawText = qResult.value;
                   quizFromFile = true;
                }
              }
            }
          } catch (qFetchErr) {
            console.error("Error fetching manual quiz file:", qFetchErr);
          }
        }
      } catch (dbErr) {
        console.error("Database error creating book from URL:", dbErr);
        return NextResponse.json({ message: "Error al registrar el libro con la URL proporcionada", error: String(dbErr) }, { status: 500 });
      }
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
      
      // Use the shared utility for all generation logic
      await generateAndSaveActivities({
        bookId: book.id,
        title: title,
        author: author,
        contentUrl: book.contentUrl || "",
        userId: (session.user as any).id || "",
        rawText: rawText || "",
        quizFromFile: quizFromFile
      });

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



