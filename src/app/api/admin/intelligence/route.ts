import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
const DEMO_USER_ID = "clt_demo_user_001";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const sessionRole = session?.user?.role;
  const role =
    sessionRole === "ADMIN" || sessionRole === "TEACHER" || sessionRole === "STUDENT"
      ? sessionRole
      : (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role;

  if (role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const activityDb = prisma as unknown as {
    userActivity: {
      findMany: (args: unknown) => Promise<Array<{ userId: string }>>;
      groupBy: (args: unknown) => Promise<unknown>;
    };
    bookView: {
      groupBy: (args: unknown) => Promise<unknown>;
    };
  };

  const now = new Date();
  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  const monthStart = addDays(today, -29);
  const prevWeekStart = addDays(today, -13);
  const prevWeekEnd = addDays(today, -7);

  try {
    const [
      totalUsers,
      newUsers7d,
      totalBooks,
      recentBooks,
      readsToday,
      readsWeek,
      readsMonth,
      avgDuration,
      topBooksByReads,
      readsByDayRows,
      usersByDayRows,
      activityByHourRows,
      readsThisWeekByBook,
      readsPrevWeekByBook,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.book.count(),
      prisma.book.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, author: true, createdAt: true },
      }),
      prisma.readingSession.count({ where: { startTime: { gte: today } } }),
      prisma.readingSession.count({ where: { startTime: { gte: weekStart } } }),
      prisma.readingSession.count({ where: { startTime: { gte: monthStart } } }),
      prisma.readingSession.aggregate({
        where: { durationSeconds: { gt: 0 }, startTime: { gte: monthStart } },
        _avg: { durationSeconds: true },
      }),
      prisma.readingSession.groupBy({
        by: ["bookId"],
        where: { startTime: { gte: monthStart } },
        _count: { bookId: true },
        orderBy: { _count: { bookId: "desc" } },
        take: 6,
      }),
      prisma.$queryRaw<Array<{ day: string; count: number }>>`
        SELECT strftime('%Y-%m-%d', startTime) as day, COUNT(*) as count
        FROM ReadingSession
        WHERE startTime >= ${monthStart}
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.$queryRaw<Array<{ day: string; count: number }>>`
        SELECT strftime('%Y-%m-%d', createdAt) as day, COUNT(*) as count
        FROM User
        WHERE createdAt >= ${monthStart}
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.$queryRaw<Array<{ hour: number; count: number }>>`
        SELECT CAST(strftime('%H', createdAt) AS INTEGER) as hour, COUNT(*) as count
        FROM UserActivity
        WHERE createdAt >= ${weekStart} AND userId != ${DEMO_USER_ID}
        GROUP BY hour
        ORDER BY hour ASC
      `,
      prisma.readingSession.groupBy({
        by: ["bookId"],
        where: { startTime: { gte: weekStart } },
        _count: { bookId: true },
        orderBy: { bookId: "asc" },
      }),
      prisma.readingSession.groupBy({
        by: ["bookId"],
        where: { startTime: { gte: prevWeekStart, lt: prevWeekEnd } },
        _count: { bookId: true },
        orderBy: { bookId: "asc" },
      }),
    ]);

    const topBooksByReadsTyped = topBooksByReads as Array<{ bookId: string; _count: { bookId: number } }>;
    const readsThisWeekByBookTyped = readsThisWeekByBook as Array<{ bookId: string; _count: { bookId: number } }>;
    const readsPrevWeekByBookTyped = readsPrevWeekByBook as Array<{ bookId: string; _count: { bookId: number } }>;

    const [activeTodayDistinct, activeWeekDistinct] = await Promise.all([
      activityDb.userActivity.findMany({
        where: { createdAt: { gte: today }, userId: { not: DEMO_USER_ID } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      activityDb.userActivity.findMany({
        where: { createdAt: { gte: weekStart }, userId: { not: DEMO_USER_ID } },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);

    const topPagesRowsTyped = (await activityDb.userActivity.groupBy({
      by: ["path"],
      where: { type: "PAGE_VIEW", createdAt: { gte: weekStart }, userId: { not: DEMO_USER_ID }, path: { not: null } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    })) as Array<{ path: string | null; _count: { path: number } }>;

    const topBooksOpenedRowsTyped = (await activityDb.bookView.groupBy({
      by: ["bookId"],
      where: { createdAt: { gte: weekStart }, userId: { not: DEMO_USER_ID } },
      _count: { bookId: true },
      orderBy: { _count: { bookId: "desc" } },
      take: 6,
    })) as Array<{ bookId: string; _count: { bookId: number } }>;

    const topUsersRowsTyped = (await activityDb.userActivity.groupBy({
      by: ["userId"],
      where: { type: "BOOK_OPEN", createdAt: { gte: weekStart }, userId: { not: DEMO_USER_ID } },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 8,
    })) as Array<{ userId: string; _count: { userId: number } }>;

    const topBookIds = topBooksByReadsTyped.map((r) => r.bookId);
    const topBookViewsIds = topBooksOpenedRowsTyped.map((r) => r.bookId);
    const bookIdsToFetch = Array.from(new Set([...topBookIds, ...topBookViewsIds]));
    const books = await prisma.book.findMany({
      where: { id: { in: bookIdsToFetch } },
      select: { id: true, title: true, author: true },
    });
    const bookById = new Map(books.map((b) => [b.id, b]));

    const readsThisWeekMap = new Map(readsThisWeekByBookTyped.map((r) => [r.bookId, r._count.bookId]));
    const readsPrevWeekMap = new Map(readsPrevWeekByBookTyped.map((r) => [r.bookId, r._count.bookId]));

    const topBooksTable = topBooksByReadsTyped.map((r) => {
      const book = bookById.get(r.bookId);
      const nowWeek = readsThisWeekMap.get(r.bookId) ?? 0;
      const prevWeek = readsPrevWeekMap.get(r.bookId) ?? 0;
      const growth = prevWeek === 0 ? (nowWeek > 0 ? 100 : 0) : Math.round(((nowWeek - prevWeek) / prevWeek) * 100);
      return {
        id: r.bookId,
        title: book?.title ?? r.bookId,
        author: book?.author ?? "",
        reads: r._count.bookId,
        weeklyGrowth: growth,
      };
    });

    const userIds = topUsersRowsTyped.map((u) => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const topUsersTable = await Promise.all(
      topUsersRowsTyped.map(async (row) => {
        const user = userById.get(row.userId);
        const [sumDuration, completedBooks] = await prisma.$transaction([
          prisma.readingSession.aggregate({
            where: { userId: row.userId, durationSeconds: { gt: 0 }, startTime: { gte: monthStart } },
            _sum: { durationSeconds: true },
          }),
          prisma.userBook.count({ where: { userId: row.userId, status: "COMPLETED" } }),
        ]);

        return {
          id: row.userId,
          name: user?.name ?? "Usuario",
          email: user?.email ?? "",
          readingSeconds: sumDuration._sum.durationSeconds ?? 0,
          booksCompleted: completedBooks,
        };
      })
    );

    const topPages = topPagesRowsTyped
      .map((r) => ({ path: r.path ?? "", count: r._count.path }))
      .filter((p) => p.path);

    const topBooksOpened = topBooksOpenedRowsTyped.map((r) => {
      const book = bookById.get(r.bookId);
      return {
        id: r.bookId,
        title: book?.title ?? r.bookId,
        author: book?.author ?? "",
        opens: r._count.bookId,
      };
    });

    const readsByDay = readsByDayRows.map((r) => ({ day: r.day, count: Number(r.count) }));
    const usersGrowth = usersByDayRows.map((r) => ({ day: r.day, count: Number(r.count) }));
    const activityByHour = activityByHourRows.map((r) => ({ hour: Number(r.hour), count: Number(r.count) }));

    return NextResponse.json({
      users: {
        total: totalUsers,
        activeToday: activeTodayDistinct.length,
        activeWeek: activeWeekDistinct.length,
        newUsers7d,
      },
      books: {
        total: totalBooks,
        recent: recentBooks,
        topRead: topBooksTable.slice(0, 5),
      },
      reading: {
        readsToday,
        readsWeek,
        readsMonth,
        avgReadingSeconds: Math.round(avgDuration._avg.durationSeconds ?? 0),
      },
      activity: {
        topPages,
        topBooksOpened,
        peakHours: activityByHour.slice().sort((a, b) => b.count - a.count).slice(0, 5),
      },
      charts: {
        readsByDay,
        usersGrowth,
        popularBooks: topBooksTable.slice(0, 6).map((b) => ({ name: b.title, count: b.reads })),
        activityByHour,
      },
      tables: {
        topBooks: topBooksTable,
        topUsers: topUsersTable,
      },
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
