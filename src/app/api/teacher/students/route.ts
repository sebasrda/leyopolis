import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * Aggregated roster for the logged-in TEACHER / COORDINATOR / ADMIN.
 *
 * Returns one row per student that the user has access to (TEACHER sees only
 * students enrolled in their classes; COORDINATOR / ADMIN see the whole
 * institution). For each student we attach:
 *   - identity (id, name, email, grade)
 *   - gamification (xp, level, streak)
 *   - reading totals (minutes, pages, completed books)
 *   - last 5 quiz attempts (score + activity title + date)
 *   - lastActive timestamp
 *   - atRisk flag + reason
 *   - which classes they belong to (names)
 */
export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // 1) Scope: teachers see only their classes' students; coordinators/admins
    //    see the whole institution roster.
    const me = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { institutionId: true },
    });

    let studentIds: string[] = [];

    if (user.role === "TEACHER") {
      const classes = await (prisma as any).class.findMany({
        where: { teacherId: user.userId },
        select: {
          id: true,
          name: true,
          students: { select: { id: true } },
        },
      });
      const idSet = new Set<string>();
      const classMap = new Map<string, string[]>(); // studentId -> [class names]
      for (const c of classes) {
        for (const s of c.students) {
          idSet.add(s.id);
          const cur = classMap.get(s.id) || [];
          cur.push(c.name);
          classMap.set(s.id, cur);
        }
      }
      studentIds = Array.from(idSet);

      return await aggregateAndRespond(studentIds, classMap);
    }

    // COORDINATOR / ADMIN / SUPERADMIN — institution-scoped
    const where: any = { role: "STUDENT" };
    if (me?.institutionId && user.role !== "SUPERADMIN") {
      where.institutionId = me.institutionId;
    }
    const studs = await prisma.user.findMany({
      where,
      select: { id: true },
      take: 500,
    });
    studentIds = studs.map((s) => s.id);

    // Build class map for institution roster (which classes they're in)
    const classes = await (prisma as any).class.findMany({
      where: me?.institutionId ? { institutionId: me.institutionId } : {},
      select: { name: true, students: { select: { id: true } } },
    });
    const classMap = new Map<string, string[]>();
    for (const c of classes) {
      for (const s of c.students) {
        const cur = classMap.get(s.id) || [];
        cur.push(c.name);
        classMap.set(s.id, cur);
      }
    }

    return await aggregateAndRespond(studentIds, classMap);
  } catch (error: any) {
    console.error("/api/teacher/students error:", error);
    return NextResponse.json({ message: error?.message || "Internal error" }, { status: 500 });
  }
}

async function aggregateAndRespond(studentIds: string[], classMap: Map<string, string[]>) {
  if (studentIds.length === 0) {
    return NextResponse.json({ students: [], generatedAt: new Date().toISOString() });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

  // Fetch all aggregates in parallel
  const [users, sessions, userBooks, attempts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        email: true,
        grade: true,
        xp: true,
        level: true,
        streak: true,
        lastActive: true,
        createdAt: true,
        licenseType: true,
        expiresAt: true,
        image: true,
      },
    }),
    prisma.readingSession.findMany({
      where: { userId: { in: studentIds } },
      select: { userId: true, durationSeconds: true, pagesRead: true, startTime: true },
    }),
    (prisma as any).userBook.findMany({
      where: { userId: { in: studentIds } },
      select: { userId: true, status: true, bookId: true },
    }),
    (prisma as any).activityAttempt.findMany({
      where: { userId: { in: studentIds } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        userId: true,
        score: true,
        createdAt: true,
        activity: { select: { id: true, title: true, type: true } },
      },
    }),
  ]);

  // Index aggregates by userId
  const sessionsBy = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const cur = sessionsBy.get(s.userId) || [];
    cur.push(s);
    sessionsBy.set(s.userId, cur);
  }
  const userBooksBy = new Map<string, any[]>();
  for (const ub of userBooks) {
    const cur = userBooksBy.get(ub.userId) || [];
    cur.push(ub);
    userBooksBy.set(ub.userId, cur);
  }
  const attemptsBy = new Map<string, any[]>();
  for (const a of attempts) {
    const cur = attemptsBy.get(a.userId) || [];
    cur.push(a);
    attemptsBy.set(a.userId, cur);
  }

  const rows = users.map((u) => {
    const userSessions = sessionsBy.get(u.id) || [];
    const userBooksList = userBooksBy.get(u.id) || [];
    const userAttempts = attemptsBy.get(u.id) || [];

    const totalSeconds = userSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalPages = userSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const completedBooks = userBooksList.filter((ub) => ub.status === "COMPLETED").length;
    const inProgressBooks = userBooksList.filter((ub) => ub.status === "IN_PROGRESS").length;

    const minutesThisWeek = userSessions
      .filter((s) => s.startTime && new Date(s.startTime) >= weekAgo)
      .reduce((sum, s) => sum + Math.round((s.durationSeconds || 0) / 60), 0);

    const recentAttempts = userAttempts.slice(0, 5).map((a) => ({
      id: a.id,
      score: Math.round(a.score || 0),
      title: a.activity?.title || "Actividad",
      type: a.activity?.type || "",
      date: a.createdAt.toISOString(),
    }));

    const avgScore =
      userAttempts.length > 0
        ? Math.round(userAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / userAttempts.length)
        : null;

    // ── Risk evaluation ──────────────────────────────────────────────────
    const reasons: string[] = [];
    const lastActiveDate = u.lastActive ? new Date(u.lastActive) : null;
    if (!lastActiveDate || lastActiveDate < threeDaysAgo) {
      reasons.push("Inactivo más de 3 días");
    }
    if (avgScore !== null && avgScore < 60) {
      reasons.push(`Promedio de quizzes ${avgScore}%`);
    }
    if (u.streak === 0 && minutesThisWeek < 15) {
      reasons.push("Sin racha y poco tiempo esta semana");
    }
    if (minutesThisWeek === 0 && totalMinutes > 0) {
      reasons.push("0 minutos de lectura esta semana");
    }
    const atRisk = reasons.length > 0;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      grade: u.grade,
      image: u.image,
      licenseType: u.licenseType,
      expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
      classes: classMap.get(u.id) || [],
      xp: u.xp ?? 0,
      level: u.level ?? 1,
      streak: u.streak ?? 0,
      lastActive: lastActiveDate ? lastActiveDate.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      totalMinutes,
      totalPages,
      minutesThisWeek,
      completedBooks,
      inProgressBooks,
      attemptsCount: userAttempts.length,
      avgScore,
      recentAttempts,
      atRisk,
      atRiskReason: reasons.join(" · "),
    };
  });

  // Sort: at-risk first (most reasons), then by lastActive desc
  rows.sort((a, b) => {
    if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
    const aT = a.lastActive ? new Date(a.lastActive).getTime() : 0;
    const bT = b.lastActive ? new Date(b.lastActive).getTime() : 0;
    return bT - aT;
  });

  return NextResponse.json({
    students: rows,
    generatedAt: new Date().toISOString(),
  });
}
