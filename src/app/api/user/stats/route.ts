
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEMO_USER_ID = "clt_demo_user_001";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Demo fallback
  const userId = session?.user?.id || DEMO_USER_ID;

  try {
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

    // 1. Get Reading Sessions Aggregate
    const sessions = await prisma.readingSession.findMany({
      where: { userId },
      select: {
        durationSeconds: true,
        pagesRead: true,
        startTime: true,
        bookId: true
      }
    });

    let totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    let totalPagesFromSessions = sessions.reduce((acc, s) => acc + s.pagesRead, 0);
    
    // 2. Get UserBooks to calculate estimated total pages if session data is missing
    const userBooks = await prisma.userBook.findMany({
      where: { userId },
      include: {
        book: {
          select: { title: true }
        }
      }
    });

    const completedBooks = userBooks.filter(b => b.status === "COMPLETED").length;
    
    // Simple heuristic: if totalPagesFromSessions is 0 but we have in-progress books, 
    // it likely means the session tracking is lagging.
    // We don't want to double count, so we take the max of session tracking OR a very conservative estimate.
    // However, the best way is to trust the sessions for TIME and use userBooks for BOOKS COMPLETED.
    
    // For pages, let's use a hybrid approach:
    // If sessions have 0 pages but UserBook has progress, we estimate pages as progress% * average_book_pages(200)
    let totalPages = totalPagesFromSessions;
    if (totalPages === 0 && userBooks.length > 0) {
        totalPages = userBooks.reduce((acc, ub) => acc + Math.round((ub.progress / 100) * 150), 0);
    }

    // Calculate distinct days
    const uniqueDays = new Set(sessions.map(s => new Date(s.startTime).toDateString()));
    const daysActive = uniqueDays.size || 1;
    const averageDailySeconds = Math.round(totalSeconds / daysActive);

    // 3. Format time
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };

    return NextResponse.json({
      totalTime: formatTime(totalSeconds),
      totalSeconds,
      totalPages,
      averageDailyTime: formatTime(averageDailySeconds),
      booksCompleted: completedBooks,
      sessionsCount: sessions.length
    });

  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}



