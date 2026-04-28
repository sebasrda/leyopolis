import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  const userId = session.user.id;
  const referer = req.headers.get("referer");

  try {
    const { bookId, chapterId, bookTitle, contentUrl, coverImage, author, category, language, difficulty, format } =
      await req.json();

    if (!bookId) return NextResponse.json({ message: "Book ID required" }, { status: 400 });

    const existingBook = await (prisma as any).book.findUnique({ where: { id: bookId } });
    if (!existingBook) {
      if (!contentUrl) return NextResponse.json({ message: "contentUrl required for new book" }, { status: 400 });
      await (prisma as any).book.create({
        data: {
          id: bookId, title: bookTitle || "Libro", author: author || "Desconocido",
          description: null, coverImage: coverImage || null, category: category || "General",
          language: language || "Español", difficulty: difficulty || "Intermedio",
          format: format || "PDF", contentUrl,
        },
      });
    }

    await prisma.userBook.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { lastRead: new Date(), status: "IN_PROGRESS" },
      create: { userId, bookId, progress: 0, status: "IN_PROGRESS", lastRead: new Date() },
    });

    try {
      await (prisma as any).bookView.create({ data: { userId, bookId, path: referer?.slice(0, 512) ?? null } });
      await (prisma as any).userActivity.create({ data: { userId, type: "BOOK_OPEN", bookId, path: referer?.slice(0, 512) ?? null } });
    } catch { /* optional tracking */ }

    const newSession = await prisma.readingSession.create({
      data: { userId, bookId, chapterId, startTime: new Date() },
    });

    return NextResponse.json({ sessionId: newSession.id });
  } catch (error) {
    console.error("Error starting reading session:", error);
    return NextResponse.json({ message: "Error starting session" }, { status: 500 });
  }
}
