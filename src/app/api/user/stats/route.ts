export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    // Read xp/level/streak directly from DB — session JWT tokens are stale after DB updates
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streak: true },
    });

    const sessions = await prisma.readingSession.findMany({
      where: { userId },
      select: { durationSeconds: true, pagesRead: true, startTime: true, endTime: true, bookId: true },
    });

    const userBooks = await prisma.userBook.findMany({ where: { userId } });
    const completedBooks = userBooks.filter(b => b.status === "COMPLETED").length;

    // Estimate seconds from endTime-startTime when durationSeconds is missing/zero
    const totalSeconds = sessions.reduce((acc, s) => {
      let secs = s.durationSeconds ?? 0;
      if (secs === 0 && s.endTime && s.startTime) {
        secs = Math.min(
          Math.floor((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000),
          7200 // cap at 2 hours per session
        );
      }
      return acc + Math.max(0, secs);
    }, 0);

    const totalPages = sessions.reduce((acc, s) => acc + (s.pagesRead || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    const booksInSessions = new Set(sessions.map(s => s.bookId));
    const userBookIds = userBooks.map(ub => ub.bookId);
    const allUniqueBooks = new Set([...Array.from(booksInSessions), ...userBookIds]);

    const formatTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };

    return NextResponse.json({
      totalTime: formatTime(totalSeconds),
      totalSeconds,
      totalPages,
      averageDailyMinutes: sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0,
      totalMinutes,
      completedBooks: completedBooks || 0,
      totalBooks: allUniqueBooks.size,
      streak: user?.streak ?? 0,
      level: user?.level ?? 1,
      xp: user?.xp ?? 0,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
