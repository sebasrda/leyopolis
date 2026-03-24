
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const cover = formData.get("cover") as File;
    const title = formData.get("title") as string;
    const author = formData.get("author") as string || "Autor Desconocido";
    const category = formData.get("category") as string || "General";
    const difficulty = formData.get("difficulty") as string || "Intermedio";

    if (!file) {
      return NextResponse.json(
        { message: "No se ha proporcionado ningún archivo PDF" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replaceAll(" ", "_");
    
    // Save PDF
    const publicPath = path.join(process.cwd(), "public", "books", filename);
    await writeFile(publicPath, buffer);
    
    // Save Cover if exists
    let coverUrl = "https://placehold.co/400x600?text=PDF";
    if (cover) {
      const coverBuffer = Buffer.from(await cover.arrayBuffer());
      const coverFilename = `cover-${Date.now()}-${cover.name.replaceAll(" ", "_")}`;
      const coverPath = path.join(process.cwd(), "public", "books", coverFilename);
      await writeFile(coverPath, coverBuffer);
      coverUrl = `/books/${coverFilename}`;
    }
    
    // Create DB entry
    const book = await prisma.book.create({
      data: {
        title: title || file.name.replace(".pdf", ""),
        author,
        category,
        difficulty,
        language: "Español", // Default
        format: "PDF",
        contentUrl: `/books/${filename}`,
        coverImage: coverUrl,
        description: "Libro subido por el administrador"
      }
    });

    return NextResponse.json({ 
      message: "Libro subido exitosamente", 
      book 
    });
    
  } catch (error) {
    console.error("Error al subir libro:", error);
    return NextResponse.json(
      { message: "Error interno del servidor al procesar el archivo" },
      { status: 500 }
    );
  }
}
