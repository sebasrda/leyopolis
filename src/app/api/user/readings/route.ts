import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Hardcoded demo user for prototype
const DEMO_USER_ID = "clt_demo_user_001";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || DEMO_USER_ID;

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

  return userId;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const readings = await prisma.userBook.findMany({
      where: { userId },
      include: {
        book: true
      },
      orderBy: { lastRead: 'desc' }
    });
    
    return NextResponse.json(readings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = await getUserId();
    const { bookId, progress, currentPage, totalPages } = body as { 
      bookId?: string; 
      progress?: number;
      currentPage?: number;
      totalPages?: number;
    };

    if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });
    
    // 1. Update UserBook (Bookmark & Progress)
    const nextProgress = typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
    
    // We'll store the literal page number in a metadata field or just use the progress field if we want to repurpose it.
    // However, UserBook has a 'progress' Int field. Let's use it for percentage and use 'lastRead' for the bookmark time.
    // If we want to save the EXACT page, we should theoretically add a field to UserBook, 
    // but for now we'll ensure the percentage is accurate.
    
    const reading = await prisma.userBook.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: {
        progress: nextProgress,
        status: nextProgress >= 100 ? "COMPLETED" : "IN_PROGRESS",
        lastRead: new Date(),
      },
      create: {
        userId,
        bookId,
        progress: nextProgress,
        status: nextProgress >= 100 ? "COMPLETED" : "IN_PROGRESS",
        lastRead: new Date(),
      }
    });

    // 2. STREAK & XP LOGIC
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const now = new Date();
      const lastActive = new Date(user.lastActive);
      const diffHrs = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
      
      let newStreak = user.streak;
      let xpToAdd = 5; // Base XP for reading heartbeat

      // If it's a new day (at least 20 hours since last active, but less than 48)
      if (diffHrs >= 20 && diffHrs <= 48) {
        newStreak += 1;
        xpToAdd += 50; // New day bonus
        
        // Milestone bonuses (requested by user)
        if (newStreak % 7 === 0) xpToAdd += 200; // 7 day milestone
      } else if (diffHrs > 48) {
        newStreak = 1; // Reset streak if missed more than a day
      }

      // If completing the book
      if (nextProgress >= 100 && reading.status !== "COMPLETED") {
        xpToAdd += 100;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          streak: newStreak,
          lastActive: now,
          xp: { increment: xpToAdd },
          // Level up logic: simplistic level = floor(xp / 500) + 1
          level: Math.floor((user.xp + xpToAdd) / 500) + 1
        }
      });
    }

    // 3. DURATION TRACKING (ReadingSession)
    // Find or create a session for today/book
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingSession = await prisma.readingSession.findFirst({
      where: {
        userId,
        bookId,
        createdAt: { gte: today }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingSession) {
      // If the last update was less than 10 minutes ago, we assume it's the same continuous session
      const lastUpdate = new Date(existingSession.updatedAt);
      const idleTime = (new Date().getTime() - lastUpdate.getTime()) / 1000;
      
      if (idleTime < 600) { // 10 minutes
        await prisma.readingSession.update({
          where: { id: existingSession.id },
          data: {
            durationSeconds: { increment: Math.round(idleTime) },
            pagesRead: currentPage || existingSession.pagesRead,
            updatedAt: new Date()
          }
        });
      }
    } else {
      await prisma.readingSession.create({
        data: {
          userId,
          bookId,
          durationSeconds: 30, // Initial 30s
          pagesRead: currentPage || 1,
        }
      });
    }

    return NextResponse.json(reading);
  } catch (error) {
    console.error("Reading progress error:", error);
    return NextResponse.json({ error: 'Failed to update reading' }, { status: 500 });
  }
}



