import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { GamificationProvider } from "@/context/GamificationContext";
import { LearningProvider } from "@/context/LearningContext";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentsForUser, type StudentRow } from "@/lib/teacherStudents";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Fetch XP/level/stats on the SERVER — bypasses all client-side caching issues
  let serverXp = 0;
  let serverLevel = 1;
  let serverStreak = 0;
  let serverTotalMinutes = 0;
  let serverTotalChallenges = 0;
  let serverBooks: any[] = [];
  let serverDaysThisWeek = 0;
  let serverLastActive: Date | null = null;
  let serverTeacherStudents: StudentRow[] = [];

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const userId = session.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true, streak: true, lastActive: true, role: true },
      });
      if (user) {
        serverXp = user.xp;
        serverLevel = user.level;
        serverStreak = user.streak;
        serverLastActive = user.lastActive;
      }

      // Pre-fetch teacher/coordinator/admin roster server-side so the panel
      // has data on first render (no waiting on client-side API call)
      const role = (user?.role || (session.user as any)?.role) as string;
      if (role && ["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(role)) {
        try {
          serverTeacherStudents = await getStudentsForUser(userId, role as any);
        } catch (e) {
          console.error("[Layout] Failed to fetch teacher students:", e);
        }
      }

      const sessions = await prisma.readingSession.findMany({
        where: { userId },
        select: { durationSeconds: true, startTime: true }
      });
      const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      serverTotalMinutes = Math.round(totalSeconds / 60);

      // Distinct active days in the current ISO week (Mon-Sun). MUST match
      // the logic in /api/user/progress so the SSR initial render and the
      // client-side refresh agree on the weekly-goal percentage.
      const now = new Date();
      const weekStart = new Date(now);
      const dayIdx = weekStart.getDay();
      const offsetToMonday = dayIdx === 0 ? -6 : 1 - dayIdx;
      weekStart.setDate(weekStart.getDate() + offsetToMonday);
      weekStart.setHours(0, 0, 0, 0);
      const uniqueDays = new Set<string>();
      for (const s of sessions) {
        if (s.startTime && s.startTime >= weekStart) {
          uniqueDays.add(new Date(s.startTime).toISOString().slice(0, 10));
        }
      }
      if (serverLastActive && serverLastActive >= weekStart) {
        uniqueDays.add(now.toISOString().slice(0, 10));
      }
      serverDaysThisWeek = Math.min(7, uniqueDays.size);

      serverTotalChallenges = await prisma.userChallenge.count({
        where: { userId }
      });

      // Fetch books
      serverBooks = await prisma.userBook.findMany({
        where: { userId },
        include: {
          book: {
            select: { id: true, title: true, author: true, coverImage: true, category: true }
          }
        },
        orderBy: { lastRead: 'desc' }
      });
    }
  } catch (e) {
    console.error("[Layout] Failed to fetch user progress/stats/books:", e);
  }

  return (
    <GamificationProvider>
      <LearningProvider>
        {/* Inject server-side data into window for guaranteed access */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SERVER_PROGRESS__=${JSON.stringify({
              xp: serverXp,
              level: serverLevel,
              streak: serverStreak,
              daysActiveThisWeek: serverDaysThisWeek,
              totalMinutes: serverTotalMinutes,
              totalChallenges: serverTotalChallenges,
              books: serverBooks
            })};window.__SERVER_TEACHER_STUDENTS__=${JSON.stringify(serverTeacherStudents)};`
          }}
        />
        <DashboardLayout
          serverXp={serverXp}
          serverLevel={serverLevel}
          serverStreak={serverStreak}
        >
          {children}
        </DashboardLayout>
      </LearningProvider>
    </GamificationProvider>
  );
}
