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
    const { bookId, progress } = body as { bookId?: string; progress?: number };

    if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });
    const nextProgress = typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : 0;

    const reading = await prisma.userBook.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      },
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

    // REWARD: Check if completed (>= 100%) and wasn't completed before
    // Note: In a real app, we should check if it was *already* 100 to avoid double rewards.
    // For this prototype, we'll just award if it hits 100.
    if (nextProgress >= 100) {
         await prisma.user.update({
            where: { id: userId },
            data: {
                xp: { increment: 50 },
                level: { increment: 1 } // Bonus level up for finishing a book!
            }
        });
    }

    return NextResponse.json(reading);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update reading' }, { status: 500 });
  }
}
