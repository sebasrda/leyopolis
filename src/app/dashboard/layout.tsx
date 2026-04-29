import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { GamificationProvider } from "@/context/GamificationContext";
import { LearningProvider } from "@/context/LearningContext";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Fetch XP/level/stats on the SERVER — bypasses all client-side caching issues
  let serverXp = 0;
  let serverLevel = 1;
  let serverStreak = 0;
  let serverTotalMinutes = 0;
  let serverTotalChallenges = 0;

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const userId = session.user.id;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true, streak: true },
      });
      if (user) {
        serverXp = user.xp;
        serverLevel = user.level;
        serverStreak = user.streak;
      }
      
      const sessions = await prisma.readingSession.findMany({
        where: { userId },
        select: { durationSeconds: true }
      });
      const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      serverTotalMinutes = Math.round(totalSeconds / 60);
      
      serverTotalChallenges = await prisma.userChallenge.count({
        where: { userId }
      });
    }
  } catch (e) {
    console.error("[Layout] Failed to fetch user progress/stats:", e);
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
              totalMinutes: serverTotalMinutes,
              totalChallenges: serverTotalChallenges
            })};`
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
