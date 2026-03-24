import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "clt_demo_user_001";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || DEMO_USER_ID;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const path = typeof body.path === "string" ? body.path.slice(0, 512) : null;
    const bookId = typeof body.bookId === "string" ? body.bookId.slice(0, 128) : null;
    const metadata =
      typeof body.metadata === "string"
        ? body.metadata.slice(0, 2000)
        : body.metadata
          ? JSON.stringify(body.metadata).slice(0, 2000)
          : null;

    const activityDb = prisma as unknown as {
      userActivity: {
        create: (args: {
          data: { userId: string; type: string; path?: string | null; bookId?: string | null; metadata?: string | null };
        }) => Promise<unknown>;
      };
    };

    await activityDb.userActivity.create({
      data: {
        userId,
        type: "WEBVIEW_CLICK",
        path,
        bookId,
        metadata,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

