
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEMO_USER_ID = "clt_demo_user_001";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Demo fallback
  const userId = session?.user?.id || DEMO_USER_ID;

  try {
    const { sessionId, durationSeconds, pagesRead, progress, bookId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ message: "Session ID required" }, { status: 400 });
    }

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

    // Update session duration and pages read
    const updatedSession = await prisma.readingSession.update({
      where: { id: sessionId },
      data: {
        endTime: new Date(),
        durationSeconds,
        pagesRead
      }
    });

    // Update overall UserBook progress if bookId is provided
    if (bookId && progress !== undefined) {
      await prisma.userBook.upsert({
        where: { userId_bookId: { userId, bookId } },
        update: {
          progress: progress,
          lastRead: new Date(),
          status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS"
        },
        create: {
          userId,
          bookId,
          progress,
          status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS",
          lastRead: new Date()
        }
      });
      
      // Update Gamification (XP, Streak) - Simplistic implementation
      // +1 XP per minute read (update periodically)
      // To avoid duplicate XP, maybe handle this differently or just allow it for simplicity
      // For now, let's skip XP in update to avoid spamming XP on every heartbeat
      // Or track 'lastXpUpdate'
    }

    return NextResponse.json({ message: "Session updated successfully", session: updatedSession });
  } catch (error) {
    console.error("Error updating reading session:", error);
    return NextResponse.json({ message: "Error updating session" }, { status: 500 });
  }
}
