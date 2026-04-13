
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
    // Aggregate stats
    const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const totalPages = sessions.reduce((acc, s) => acc + (s.pagesRead || 0), 0);
    const averageDailySeconds = sessions.length > 0 ? totalSeconds / sessions.length : 0;
    
    // Count unique books with sessions and merge with UserBooks
    const booksInSessions = new Set(sessions.map(s => s.bookId));
    const userBookIds = userBooks.map(ub => ub.bookId);
    const allUniqueBookIds = new Set([...Array.from(booksInSessions), ...userBookIds]);

    const formatTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      if (hrs > 0) return `${hrs}h ${mins}m`;
      return `${mins}m`;
    };

    // Final Result Object - The single source of truth for ALL dashboards
    const responseData = {
      totalTime: formatTime(totalSeconds),
      totalSeconds,
      totalPages,
      averageDailyMinutes: Math.round(averageDailySeconds / 60),
      totalMinutes: Math.round(totalSeconds / 60),
      completedBooks: completedBooks || 0,
      totalBooks: allUniqueBookIds.size,
      streak: (session?.user as any)?.streak || 0,
      level: (session?.user as any)?.level || 1,
      xp: (session?.user as any)?.xp || 0
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}



