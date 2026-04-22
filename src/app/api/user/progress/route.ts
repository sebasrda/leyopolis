export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Hardcoded demo user for prototype
const DEMO_USER_ID = "clt_demo_user_001";

export async function GET() {
  try {
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streak: true, lastActive: true }
    });

    if (!user) return NextResponse.json({ xp: 0, level: 1, streak: 0 });

    const now = new Date();
    const lastActive = user.lastActive ? new Date(user.lastActive) : now;
    const diffHrs = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

    let currentStreak = user.streak;
    let updated = false;

    // If more than 20 hours since last active, but less than 48, it's a new streak day
    if (diffHrs >= 20 && diffHrs <= 48) {
      currentStreak += 1;
      updated = true;
    } else if (diffHrs > 48) {
      // Missed a day
      if (currentStreak !== 1 && currentStreak !== 0) {
        currentStreak = 1;
        updated = true;
      }
    }

    if (updated) {
      await prisma.user.update({
        where: { id: userId },
        data: { streak: currentStreak, lastActive: now }
      });
    }

    return NextResponse.json({ xp: user.xp, level: user.level, streak: currentStreak });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || DEMO_USER_ID;

    const body = await request.json();
    const { xp, level, streak } = body;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: xp !== undefined ? xp : undefined,
        level: level !== undefined ? level : undefined,
        streak: streak !== undefined ? streak : undefined,
        lastActive: new Date()
      }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}



