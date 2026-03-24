
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEMO_USER_ID = "clt_demo_user_001";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const referer = req.headers.get("referer");
  const activityDb = prisma as unknown as {
    bookView: {
      create: (args: { data: { userId: string; bookId: string; path?: string | null } }) => Promise<unknown>;
    };
    userActivity: {
      create: (args: {
        data: { userId: string; type: string; path?: string | null; bookId?: string | null; metadata?: string | null };
      }) => Promise<unknown>;
    };
  };
  
  // Demo fallback
  const userId = session?.user?.id || DEMO_USER_ID;

  try {
    const { bookId, chapterId, bookTitle, contentUrl, coverImage, author, category, language, difficulty, format } =
      await req.json();

    if (!bookId) {
      return NextResponse.json({ message: "Book ID required" }, { status: 400 });
    }

    const existingBook = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existingBook) {
      if (!contentUrl) {
        return NextResponse.json({ message: "contentUrl required for new book" }, { status: 400 });
      }

      await prisma.book.create({
        data: {
          id: bookId,
          title: bookTitle || "Libro",
          author: author || "Desconocido",
          description: null,
          coverImage: coverImage || null,
          category: category || "General",
          language: language || "Español",
          difficulty: difficulty || "Intermedio",
          format: format || "PDF",
          contentUrl,
        },
      });
    }

    if (userId === DEMO_USER_ID) {
      await prisma.user.upsert({
        where: { id: DEMO_USER_ID },
        update: {},
        create: {
          id: DEMO_USER_ID,
          name: "Estudiante Demo",
          email: "demo@leyopolis.edu",
          role: "STUDENT",
        },
      });
    }

    await prisma.userBook.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: {
        lastRead: new Date(),
        status: "IN_PROGRESS",
      },
      create: {
        userId,
        bookId,
        progress: 0,
        status: "IN_PROGRESS",
        lastRead: new Date(),
      },
    });

    await activityDb.bookView.create({
      data: {
        userId,
        bookId,
        path: referer ? referer.slice(0, 512) : null,
      },
    });

    await activityDb.userActivity.create({
      data: {
        userId,
        type: "BOOK_OPEN",
        bookId,
        path: referer ? referer.slice(0, 512) : null,
      },
    });

    // Create new session
    const newSession = await prisma.readingSession.create({
      data: {
        userId,
        bookId,
        chapterId,
        startTime: new Date(),
      }
    });

    return NextResponse.json({ sessionId: newSession.id });
  } catch (error) {
    console.error("Error starting reading session:", error);
    return NextResponse.json({ message: "Error starting session" }, { status: 500 });
  }
}
