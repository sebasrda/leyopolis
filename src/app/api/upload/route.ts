
import "@/lib/pdf-polyfill";
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
    let description = "";
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
      description = body.description || "";

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
            const { PDFParse } = require("pdf-parse");
            let parser: any = null;
            try {
              parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
              rawText = (await parser.getText()).text || "";
            } finally {
              try { await parser?.destroy?.(); } catch {}
            }
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
                   const { PDFParse } = require("pdf-parse");
                   let parser: any = null;
                   try {
                     parser = new PDFParse({ data: new Uint8Array(qBuffer) });
                     rawText = (await parser.getText()).text || ""; // Use this as source for AI
                     quizFromFile = true;
                   } finally {
                     try { await parser?.destroy?.(); } catch {}
                   }
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

        // If a manual synopsis file was uploaded
        if (body.synopsisFileUrl) {
          try {
            const sFileRes = await fetch(body.synopsisFileUrl);
            if (sFileRes.ok) {
              const sBuffer = Buffer.from(await sFileRes.arrayBuffer());
              let extractedSynopsis = "";
              
              if (body.synopsisFileUrl.endsWith(".pdf")) {
              try {
                const { PDFParse } = require("pdf-parse");
                let parser: any = null;
                try {
                  parser = new PDFParse({ data: new Uint8Array(sBuffer) });
                  const result = await parser.getText();
                  extractedSynopsis = result.text || "";
                } finally {
                  try { await parser?.destroy?.(); } catch {}
                }
              } catch (pdfErr) {
                console.error("Error parsing PDF synopsis:", pdfErr);
              }
            } else if (body.synopsisFileUrl.endsWith(".docx") || body.synopsisFileUrl.endsWith(".doc")) {
                const mammoth = require("mammoth");
                const sResult = await mammoth.extractRawText({ buffer: sBuffer });
                extractedSynopsis = sResult.value;
              } else if (body.synopsisFileUrl.endsWith(".txt")) {
                extractedSynopsis = new TextDecoder().decode(sBuffer);
              }

              if (extractedSynopsis.trim()) {
                description = extractedSynopsis.trim();
                // Actualizar descripción del libro ya creado
                await (prisma as any).book.update({
                  where: { id: book.id },
                  data: { description }
                });
              }
            }
          } catch (sErr) {
            console.error("Error processing synopsis file:", sErr);
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
      description = formData.get("description") as string || "";

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

        // Extract text from buffer for immediate AI generation
        try {
          const { PDFParse } = require("pdf-parse");
          let parser: any = null;
          try {
            parser = new PDFParse({ data: new Uint8Array(buffer) });
            rawText = (await parser.getText()).text || "";
          } finally {
            try { await parser?.destroy?.(); } catch {}
          }
          await log(`Texto extraído exitosamente: ${rawText.length} caracteres`);
        } catch (parseErr) {
          console.error("Error parsing PDF text during upload:", parseErr);
          await log("Error extrayendo texto del PDF");
        }
      } catch (dbErr) {
        console.error("Database error creating book:", dbErr);
        return NextResponse.json({ message: "Error al registrar el libro en la base de datos", error: String(dbErr) }, { status: 500 });
      }
    }

    // AI Generation is now handled separately by the frontend calling /api/books/regenerate-ia 
    // to avoid timeouts and race conditions in the upload endpoint.
    return NextResponse.json({ 
      message: "Libro subido exitosamente. Generando actividades...", 
      book 
    });
  } catch (error) {
    console.error("Global upload error:", error);
    return NextResponse.json({ message: "Error crítico al procesar subida", error: String(error) }, { status: 500 });
  }
}



