import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function noStore(payload: any, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      ...(init?.headers || {}),
    },
  });
}

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
  if (!user) return noStore({ message: "Unauthorized" }, { status: 401 });
  if (!["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(user.role)) {
    return noStore({ message: "Forbidden" }, { status: 403 });
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
      // STRATEGY: query students DIRECTLY from User table filtered by enrolledClasses,
      // not from Class.students. This is a different SQL path and is more reliable
      // when the implicit many-to-many join is fetched via Class.students.
      const enrolled = await prisma.user.findMany({
        where: {
          enrolledClasses: {
            some: { teacherId: user.userId },
          },
        },
        select: {
          id: true,
          enrolledClasses: {
            where: { teacherId: user.userId },
            select: { id: true, name: true },
          },
        },
      });

      const classMap = new Map<string, string[]>();
      const classIds = new Set<string>();
      for (const u of enrolled) {
        const names = (u.enrolledClasses || []).map((c) => c.name);
        classMap.set(u.id, names);
        for (const c of (u.enrolledClasses || [])) classIds.add(c.id);
      }
      studentIds = enrolled.map((u) => u.id);

      // Best-effort: enrich with assigned books per class (do NOT block on failure)
      const assignedBooksMap = new Map<string, any[]>();
      try {
        if (classIds.size > 0) {
          const classesWithBooks = await (prisma as any).class.findMany({
            where: { id: { in: Array.from(classIds) } },
            select: {
              id: true,
              name: true,
              students: { select: { id: true } },
              assignedBooks: { select: { id: true, title: true, author: true, coverImage: true } },
              assignments: {
                select: {
                  id: true,
                  title: true,
                  dueDate: true,
                  book: { select: { id: true, title: true, author: true, coverImage: true } },
                },
              },
            },
          });
          for (const c of classesWithBooks) {
            const directBooks = (c.assignedBooks || []).map((b: any) => ({ ...b, className: c.name, dueDate: null }));
            const assignmentBooks = (c.assignments || []).filter((a: any) => a.book).map((a: any) => ({
              id: a.book.id,
              title: a.book.title,
              author: a.book.author,
              coverImage: a.book.coverImage,
              className: c.name,
              dueDate: a.dueDate ? a.dueDate.toISOString() : null,
              assignmentTitle: a.title,
            }));
            const allBooks = [...directBooks, ...assignmentBooks];
            for (const s of (c.students || [])) {
              const bks = assignedBooksMap.get(s.id) || [];
              assignedBooksMap.set(s.id, [...bks, ...allBooks]);
            }
          }
        }
      } catch (bookErr) {
        console.error("[teacher/students] enrich books failed (non-fatal):", bookErr);
      }

      const result = await aggregateAndRespond(studentIds, classMap, assignedBooksMap);
      return result;
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

    // Build class map first (critical) — student → [class names]
    const classMap = new Map<string, string[]>();
    const assignedBooksMap = new Map<string, any[]>();
    try {
      const classes = await (prisma as any).class.findMany({
        where: me?.institutionId ? { institutionId: me.institutionId } : {},
        select: {
          name: true,
          students: { select: { id: true } },
          assignedBooks: { select: { id: true, title: true, author: true, coverImage: true } },
          assignments: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              book: { select: { id: true, title: true, author: true, coverImage: true } },
            },
          },
        },
      });
      for (const c of classes) {
        const directBooks = (c.assignedBooks || []).map((b: any) => ({ ...b, className: c.name, dueDate: null }));
        const assignmentBooks = (c.assignments || []).filter((a: any) => a.book).map((a: any) => ({
          id: a.book.id,
          title: a.book.title,
          author: a.book.author,
          coverImage: a.book.coverImage,
          className: c.name,
          dueDate: a.dueDate ? a.dueDate.toISOString() : null,
          assignmentTitle: a.title,
        }));
        const allBooks = [...directBooks, ...assignmentBooks];
        for (const s of c.students) {
          const cur = classMap.get(s.id) || [];
          cur.push(c.name);
          classMap.set(s.id, cur);
          const bks = assignedBooksMap.get(s.id) || [];
          assignedBooksMap.set(s.id, [...bks, ...allBooks]);
        }
      }
    } catch (clsErr) {
      console.error("[teacher/students] coordinator class enrich failed (non-fatal):", clsErr);
    }

    return await aggregateAndRespond(studentIds, classMap, assignedBooksMap);
  } catch (error: any) {
    console.error("/api/teacher/students error:", error);
    return noStore({ message: error?.message || "Internal error", error: String(error) }, { status: 500 });
  }
}

async function aggregateAndRespond(studentIds: string[], classMap: Map<string, string[]>, assignedBooksMap: Map<string, any[]>) {
  if (studentIds.length === 0) {
    return noStore({ students: [], generatedAt: new Date().toISOString(), note: "no_students_in_scope" });
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
      select: { userId: true, durationSeconds: true, pagesRead: true, startTime: true, bookId: true },
    }),
    (prisma as any).userBook.findMany({
      where: { userId: { in: studentIds } },
      select: {
        userId: true,
        status: true,
        bookId: true,
        progress: true,
        lastRead: true,
        book: { select: { id: true, title: true, author: true, coverImage: true } },
      },
    }),
    (prisma as any).activityAttempt.findMany({
      where: { userId: { in: studentIds } },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true,
        userId: true,
        score: true,
        answers: true,
        createdAt: true,
        activity: { select: { id: true, title: true, type: true, content: true, bookId: true } },
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

    const recentAttempts = userAttempts.slice(0, 10).map((a) => {
      let parsedAnswers: any = null;
      let parsedContent: any = null;
      try { parsedAnswers = a.answers ? JSON.parse(a.answers) : null; } catch { parsedAnswers = a.answers; }
      try { parsedContent = a.activity?.content ? JSON.parse(a.activity.content) : null; } catch { parsedContent = null; }
      return {
        id: a.id,
        score: Math.round(a.score || 0),
        title: a.activity?.title || "Actividad",
        type: a.activity?.type || "",
        bookId: a.activity?.bookId || null,
        date: a.createdAt.toISOString(),
        answers: parsedAnswers,
        content: parsedContent,
      };
    });

    const avgScore =
      userAttempts.length > 0
        ? Math.round(userAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / userAttempts.length)
        : null;

    // ── Per assigned-book breakdown ─────────────────────────────────────
    const studentBooks = assignedBooksMap.get(u.id) || [];
    // Dedupe assigned books by id (a student can have the same book through
    // multiple classes/assignments)
    const dedupedAssigned = new Map<string, any>();
    for (const b of studentBooks) {
      const existing = dedupedAssigned.get(b.id);
      if (!existing) dedupedAssigned.set(b.id, b);
    }

    const userBookByBookId = new Map<string, any>();
    for (const ub of userBooksList) userBookByBookId.set(ub.bookId, ub);

    const sessionsByBook = new Map<string, { minutes: number; pages: number }>();
    for (const s of userSessions) {
      if (!s.bookId) continue;
      const cur = sessionsByBook.get(s.bookId) || { minutes: 0, pages: 0 };
      cur.minutes += Math.round((s.durationSeconds || 0) / 60);
      cur.pages += s.pagesRead || 0;
      sessionsByBook.set(s.bookId, cur);
    }

    const attemptsByBook = new Map<string, any[]>();
    for (const a of userAttempts) {
      const bid = a.activity?.bookId;
      if (!bid) continue;
      const cur = attemptsByBook.get(bid) || [];
      cur.push(a);
      attemptsByBook.set(bid, cur);
    }

    const assignedBooks = Array.from(dedupedAssigned.values()).map((b: any) => {
      const ub = userBookByBookId.get(b.id);
      const bookAttempts = attemptsByBook.get(b.id) || [];
      const bookAvg = bookAttempts.length > 0
        ? Math.round(bookAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / bookAttempts.length)
        : null;
      const reading = sessionsByBook.get(b.id) || { minutes: 0, pages: 0 };
      return {
        id: b.id,
        title: b.title,
        author: b.author,
        coverImage: b.coverImage,
        className: b.className,
        dueDate: b.dueDate,
        progress: ub?.progress ?? 0,
        status: ub?.status ?? "NOT_STARTED",
        lastRead: ub?.lastRead ? new Date(ub.lastRead).toISOString() : null,
        minutesRead: reading.minutes,
        pagesRead: reading.pages,
        attemptsCount: bookAttempts.length,
        avgScore: bookAvg,
        attempts: bookAttempts.slice(0, 5).map((a: any) => ({
          id: a.id,
          title: a.activity?.title || "Actividad",
          type: a.activity?.type || "",
          score: Math.round(a.score || 0),
          date: a.createdAt.toISOString(),
        })),
      };
    });

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
      assignedBooks,
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

  return noStore({
    students: rows,
    generatedAt: new Date().toISOString(),
  });
}
