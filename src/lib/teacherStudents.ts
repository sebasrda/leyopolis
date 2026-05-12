import { prisma } from "@/lib/prisma";

export type Role = "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN" | "STUDENT";

export interface AttemptRow {
  id: string;
  score: number;
  title: string;
  type: string;
  bookId: string | null;
  date: string;
  answers: any;
  content: any;
}

export interface AssignedBookRow {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  className: string;
  dueDate: string | null;
  progress: number;
  status: string;
  lastRead: string | null;
  minutesRead: number;
  pagesRead: number;
  attemptsCount: number;
  avgScore: number | null;
  attempts: { id: string; title: string; type: string; score: number; date: string }[];
}

export interface StudentRow {
  id: string;
  name: string | null;
  email: string | null;
  grade: string | null;
  image: string | null;
  licenseType: string | null;
  expiresAt: string | null;
  classes: string[];
  xp: number;
  level: number;
  streak: number;
  lastActive: string | null;
  createdAt: string;
  totalMinutes: number;
  totalPages: number;
  minutesThisWeek: number;
  completedBooks: number;
  inProgressBooks: number;
  attemptsCount: number;
  avgScore: number | null;
  recentAttempts: AttemptRow[];
  assignedBooks: AssignedBookRow[];
  atRisk: boolean;
  atRiskReason: string;
}

/**
 * Returns the roster of students this user has access to.
 * - TEACHER: students in their classes
 * - COORDINATOR/ADMIN: institution-wide
 * - SUPERADMIN: all
 *
 * This is callable from both server components and API routes. Returns plain
 * JSON-serializable objects (dates are ISO strings).
 */
export async function getStudentsForUser(userId: string, role: Role): Promise<StudentRow[]> {
  if (!["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(role)) return [];

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { institutionId: true },
  });

  let studentIds: string[] = [];
  const classMap = new Map<string, string[]>();
  const assignedBooksMap = new Map<string, any[]>();

  if (role === "TEACHER") {
    // Query students DIRECTLY from User table via enrolledClasses.some.teacherId.
    // This works regardless of how the implicit join table behaves for the
    // reverse direction (Class.students).
    const enrolled = await prisma.user.findMany({
      where: {
        enrolledClasses: { some: { teacherId: userId } },
      },
      select: {
        id: true,
        enrolledClasses: {
          where: { teacherId: userId },
          select: { id: true, name: true },
        },
      },
    });

    const classIds = new Set<string>();
    for (const u of enrolled) {
      const names = (u.enrolledClasses || []).map((c) => c.name);
      classMap.set(u.id, names);
      for (const c of (u.enrolledClasses || [])) classIds.add(c.id);
    }
    studentIds = enrolled.map((u) => u.id);

    if (classIds.size > 0) {
      try {
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
          const directBooks = (c.assignedBooks || []).map((b: any) => ({
            ...b,
            className: c.name,
            dueDate: null,
          }));
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
      } catch (e) {
        console.error("[teacherStudents] book enrich failed:", e);
      }
    }
  } else {
    // COORDINATOR / ADMIN / SUPERADMIN
    const where: any = { role: "STUDENT" };
    if (me?.institutionId && role !== "SUPERADMIN") {
      where.institutionId = me.institutionId;
    }
    const studs = await prisma.user.findMany({ where, select: { id: true }, take: 500 });
    studentIds = studs.map((s) => s.id);

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
    } catch (e) {
      console.error("[teacherStudents] coordinator class enrich failed:", e);
    }
  }

  if (studentIds.length === 0) return [];

  return aggregate(studentIds, classMap, assignedBooksMap);
}

async function aggregate(
  studentIds: string[],
  classMap: Map<string, string[]>,
  assignedBooksMap: Map<string, any[]>,
): Promise<StudentRow[]> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

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

  const rows: StudentRow[] = users.map((u) => {
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

    const recentAttempts: AttemptRow[] = userAttempts.slice(0, 10).map((a) => {
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
    const dedupedAssigned = new Map<string, any>();
    for (const b of studentBooks) {
      if (!dedupedAssigned.has(b.id)) dedupedAssigned.set(b.id, b);
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

    const assignedBooks: AssignedBookRow[] = Array.from(dedupedAssigned.values()).map((b: any) => {
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

    const reasons: string[] = [];
    const lastActiveDate = u.lastActive ? new Date(u.lastActive) : null;
    if (!lastActiveDate || lastActiveDate < threeDaysAgo) reasons.push("Inactivo más de 3 días");
    if (avgScore !== null && avgScore < 60) reasons.push(`Promedio de quizzes ${avgScore}%`);
    if (u.streak === 0 && minutesThisWeek < 15) reasons.push("Sin racha y poco tiempo esta semana");
    if (minutesThisWeek === 0 && totalMinutes > 0) reasons.push("0 minutos de lectura esta semana");
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

  rows.sort((a, b) => {
    if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
    const aT = a.lastActive ? new Date(a.lastActive).getTime() : 0;
    const bT = b.lastActive ? new Date(b.lastActive).getTime() : 0;
    return bT - aT;
  });

  return rows;
}
