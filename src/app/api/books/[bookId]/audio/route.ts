import "@/lib/pdf-polyfill";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transcribeWithWhisper } from "@/lib/ai/whisper";
import { alignTranscriptionWithPages } from "@/lib/ai/audio-sync";

/**
 * POST /api/books/[bookId]/audio
 * Process uploaded audio: transcribe with Whisper, align with PDF pages, save sync map
 * Body: { audioUrl: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    
    if (!session?.user || !["ADMIN", "COORDINATOR", "SUPERADMIN"].includes(userRole)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { bookId } = await params;
    const body = await request.json();
    const { audioUrl } = body;

    if (!audioUrl) {
      return NextResponse.json({ message: "audioUrl es requerido" }, { status: 400 });
    }

    // 1. Verify book exists and get PDF URL
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, contentUrl: true },
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    console.log(`[AUDIO-API] Processing audio for book: "${book.title}" (${bookId})`);

    // 2. Get AI keys from SystemSettings or environment
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: Record<string, string>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const sanitize = (key?: string) => (key || "").trim().replace(/^["']|["']$/g, '');
    const openaiKey = sanitize(settingsMap.OPENAI_API_KEY || process.env.OPENAI_API_KEY);

    if (!openaiKey) {
      return NextResponse.json(
        { message: "Se requiere una API key de OpenAI configurada para la transcripción de audio (Whisper)" },
        { status: 400 }
      );
    }

    // 3. Download audio from Blob
    console.log(`[AUDIO-API] Downloading audio from: ${audioUrl}`);
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return NextResponse.json(
        { message: `Error al descargar el audio: ${audioResponse.status}` },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    console.log(`[AUDIO-API] Audio downloaded: ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB`);

    // 4. Transcribe with Whisper
    console.log(`[AUDIO-API] Starting Whisper transcription...`);
    const transcription = await transcribeWithWhisper(audioBuffer, openaiKey, "audiobook.mp3");
    console.log(`[AUDIO-API] Transcription complete: ${transcription.words.length} words, ${transcription.duration.toFixed(1)}s`);

    // 5. Extract text from each PDF page
    console.log(`[AUDIO-API] Extracting PDF page texts...`);
    const pageTexts = await extractPdfPageTexts(book.contentUrl);
    console.log(`[AUDIO-API] Extracted text from ${pageTexts.length} pages`);

    // 6. Align transcription with pages
    console.log(`[AUDIO-API] Aligning transcription with PDF pages...`);
    const syncMap = alignTranscriptionWithPages(
      transcription.words,
      pageTexts,
      transcription.duration,
      transcription.language
    );

    // 7. Save to database
    const syncMapJson = JSON.stringify(syncMap);
    console.log(`[AUDIO-API] Saving sync map (${(syncMapJson.length / 1024).toFixed(1)}KB) to database...`);

    await prisma.book.update({
      where: { id: bookId },
      data: {
        audioUrl: audioUrl,
        audioSyncMap: syncMapJson,
      },
    });

    console.log(`[AUDIO-API] ✅ Audio processing complete for "${book.title}"`);

    return NextResponse.json({
      success: true,
      message: "Audio procesado y sincronizado correctamente",
      stats: {
        wordsTranscribed: transcription.words.length,
        pagesAligned: syncMap.pages.length,
        totalDuration: syncMap.totalDuration,
        syncMapSize: `${(syncMapJson.length / 1024).toFixed(1)}KB`,
      },
    });
  } catch (error: any) {
    console.error("[AUDIO-API] Error:", error);
    return NextResponse.json(
      { message: `Error al procesar audio: ${error.message || "Error desconocido"}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/books/[bookId]/audio
 * Remove audio and sync map from a book
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session?.user || !["ADMIN", "COORDINATOR", "SUPERADMIN"].includes(userRole)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { bookId } = await params;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, audioUrl: true },
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    // Try to delete blob if URL exists
    if (book.audioUrl) {
      try {
        const { del } = await import("@vercel/blob");
        await del(book.audioUrl);
        console.log(`[AUDIO-API] Deleted blob: ${book.audioUrl}`);
      } catch (blobErr: any) {
        console.warn(`[AUDIO-API] Could not delete blob (may not exist): ${blobErr.message}`);
      }
    }

    // Clear fields in database
    await prisma.book.update({
      where: { id: bookId },
      data: {
        audioUrl: null,
        audioSyncMap: null,
      },
    });

    return NextResponse.json({ success: true, message: "Audio eliminado correctamente" });
  } catch (error: any) {
    console.error("[AUDIO-API] Delete error:", error);
    return NextResponse.json(
      { message: `Error al eliminar audio: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Extract text content from each page of a PDF
 */
async function extractPdfPageTexts(contentUrl: string): Promise<string[]> {
  try {
    let absoluteUrl = contentUrl;
    if (contentUrl.startsWith("/")) {
      const baseUrl = process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      absoluteUrl = `${baseUrl}${contentUrl}`;
    }

    const pdfRes = await fetch(absoluteUrl);
    if (!pdfRes.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfRes.status}`);
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    
    // Use pdf-parse to get page-by-page text
    // pdf-parse doesn't natively give per-page text, so we use a custom page render
    const pdfParse = require("pdf-parse");
    
    const pageTexts: string[] = [];
    
    // First pass: get total pages
    const data = await pdfParse(pdfBuffer, {
      // Custom page renderer to capture per-page text
      pagerender: async function(pageData: any) {
        const textContent = await pageData.getTextContent();
        const text = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        pageTexts.push(text);
        return text;
      }
    });

    console.log(`[AUDIO-API] PDF parsed: ${pageTexts.length} pages, ${data.text?.length || 0} total chars`);
    return pageTexts;
  } catch (error: any) {
    console.error("[AUDIO-API] PDF extraction error:", error.message);
    return [];
  }
}
