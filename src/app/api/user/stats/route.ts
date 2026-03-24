
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

    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const totalPages = sessions.reduce((acc, s) => acc + s.pagesRead, 0);
    
    // Calculate distinct days
    const uniqueDays = new Set(sessions.map(s => new Date(s.startTime).toDateString()));
    const daysActive = uniqueDays.size || 1;
    const averageDailySeconds = Math.round(totalSeconds / daysActive);

    // 2. Get Books Completed
    const completedBooks = await prisma.userBook.count({
      where: {
        userId,
        status: "COMPLETED"
      }
    });

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
