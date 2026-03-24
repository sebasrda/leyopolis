import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "clt_demo_user_001";

export async function GET(req: Request) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "COORDINATOR" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const institutionIdParam = url.searchParams.get("institutionId");

  const userDb = prisma as unknown as {
    user: {
      findUnique: (args: unknown) => Promise<{ institutionId: string | null } | null>;
      count: (args: unknown) => Promise<number>;
      findMany: (args: unknown) => Promise<Array<{ id: string; name: string | null; email: string | null; role: string; grade: string | null }>>;
    };
    book: { count: (args?: unknown) => Promise<number> };
    userBook: { aggregate: (args: unknown) => Promise<{ _avg: { progress: number | null } }> };
    readingSession: { count: (args: unknown) => Promise<number> };
    activityAttempt: {
      aggregate: (args: unknown) => Promise<{ _avg: { score: number | null } }>;
      findMany: (args: unknown) => Promise<any[]>;
    };
    readingSessionGroup: unknown;
    $queryRaw: <T>(query: TemplateStringsArray, ...args: any[]) => Promise<T>;
  };

  const myInstitutionId =
    user.role === "ADMIN"
      ? institutionIdParam
      : (await userDb.user.findUnique({ where: { id: user.userId }, select: { institutionId: true } }))?.institutionId || null;

  if (!myInstitutionId) {
    return NextResponse.json({
      counts: { students: 0, teachers: 0, books: 0, sessions7d: 0, avgProgress: 0, avgQuiz: 0 },
      topBooks: [],
      progressByGrade: [],
      latestQuizzes: [],
    });
  }

  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [students, teachers, books, sessions7d, avgProgressAgg, avgQuizAgg] = await Promise.all([
    userDb.user.count({ where: { institutionId: myInstitutionId, role: "STUDENT" } }),
    userDb.user.count({ where: { institutionId: myInstitutionId, role: { in: ["TEACHER", "COORDINATOR"] } } }),
    userDb.book.count(),
    userDb.readingSession.count({
      where: { createdAt: { gte: weekStart }, user: { institutionId: myInstitutionId, id: { not: DEMO_USER_ID } } },
    }),
    userDb.userBook.aggregate({
      where: { user: { institutionId: myInstitutionId, id: { not: DEMO_USER_ID } } },
      _avg: { progress: true },
    }),
    userDb.activityAttempt.aggregate({
      where: { user: { institutionId: myInstitutionId, id: { not: DEMO_USER_ID } }, completedAt: { not: null } },
      _avg: { score: true },
    }),
  ]);

  const avgProgress = Math.round(avgProgressAgg._avg.progress ?? 0);
  const avgQuiz = Math.round(avgQuizAgg._avg.score ?? 0);

  const topBooks = await prisma.$queryRaw<Array<{ bookId: string; reads: number; title: string; author: string }>>`
    SELECT rs.bookId as bookId, COUNT(*) as reads, b.title as title, b.author as author
    FROM ReadingSession rs
    JOIN Book b ON b.id = rs.bookId
    JOIN User u ON u.id = rs.userId
    WHERE rs.createdAt >= ${weekStart} AND u.institutionId = ${myInstitutionId} AND u.id != ${DEMO_USER_ID}
    GROUP BY rs.bookId
    ORDER BY reads DESC
    LIMIT 6
  `;

  const progressByGrade = await prisma.$queryRaw<Array<{ grade: string; avgProgress: number }>>`
    SELECT COALESCE(u.grade, 'Sin grado') as grade, AVG(ub.progress) as avgProgress
    FROM UserBook ub
    JOIN User u ON u.id = ub.userId
    WHERE u.institutionId = ${myInstitutionId} AND u.role = 'STUDENT' AND u.id != ${DEMO_USER_ID}
    GROUP BY COALESCE(u.grade, 'Sin grado')
    ORDER BY avgProgress DESC
    LIMIT 10
  `;

  const latestAttempts = await userDb.activityAttempt.findMany({
    where: { user: { institutionId: myInstitutionId, id: { not: DEMO_USER_ID } }, completedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      user: { select: { id: true, name: true, email: true, grade: true } },
      activity: { select: { id: true, title: true, bookId: true } },
    },
  });

  return NextResponse.json({
    institutionId: myInstitutionId,
    counts: { students, teachers, books, sessions7d, avgProgress, avgQuiz },
    topBooks,
    progressByGrade: progressByGrade.map((r) => ({ grade: r.grade, avgProgress: Math.round(r.avgProgress || 0) })),
    latestQuizzes: latestAttempts.map((a: any) => ({
      id: a.id,
      score: Math.round(a.score),
      createdAt: a.createdAt,
      student: { id: a.user.id, name: a.user.name, email: a.user.email, grade: a.user.grade },
      activity: { id: a.activity.id, title: a.activity.title, bookId: a.activity.bookId },
    })),
  });
}
