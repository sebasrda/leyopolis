import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEMO_USER_ID = "clt_demo_user_001";

export async function POST(req: Request) {
  try {
    const activityDb = prisma as unknown as {
      userActivity: {
        create: (args: {
          data: { userId: string; type: string; path?: string | null; bookId?: string | null; metadata?: string | null };
        }) => Promise<unknown>;
      };
    };

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || DEMO_USER_ID;
    const body = (await req.json()) as { path?: string };
    const path = typeof body.path === "string" ? body.path.slice(0, 512) : "";

    if (!path) return NextResponse.json({ ok: true });

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

    await activityDb.userActivity.create({
      data: {
        userId,
        type: "PAGE_VIEW",
        path,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
