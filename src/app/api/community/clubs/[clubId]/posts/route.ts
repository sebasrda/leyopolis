import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { apiError, badRequest, forbidden, unauthorized } from "@/lib/apiError";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_LEN = 2000;

export async function POST(request: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  const { clubId } = await params;

  // Anti-spam: 15 posts per hour per user
  const ip = clientIp(request.headers);
  const rl = await rateLimit(`post:${user.userId}:${ip}`, { limit: 15, windowMs: 60 * 60_000 });
  if (!rl.ok) return tooManyRequestsResponse(rl, "Demasiadas publicaciones. Espera un momento.");

  try {
    const body = await request.json();
    const content = (body?.content || "").trim();

    if (!content) return badRequest("content required");
    if (content.length > MAX_LEN) return badRequest("content too long");

    // Verify membership with REAL user
    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: user.userId, clubId } },
    });
    if (!membership) return forbidden("Debes unirte al club para publicar");

    const newPost = await prisma.post.create({
      data: { content, clubId, userId: user.userId },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    // Reward: small XP bump for engagement (capped indirectly by the
    // rate limit above)
    await prisma.user.update({
      where: { id: user.userId },
      data: { xp: { increment: 10 } },
    });

    return NextResponse.json({
      id: newPost.id,
      content: newPost.content,
      createdAt: newPost.createdAt,
      author: newPost.user,
      commentsCount: newPost._count.comments,
      likesCount: newPost._count.likes,
      liked: false,
      isMine: true,
    }, { status: 201 });
  } catch (error) {
    return apiError(error, 500, "create post failed");
  }
}
