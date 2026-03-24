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

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streak: true }
    });

    if (!user) return NextResponse.json({ xp: 0, level: 1, streak: 0 });

    return NextResponse.json(user);
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
