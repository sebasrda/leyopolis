import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/apiError";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/community/posts/[postId]/like
 * Toggles a like for the current user. Idempotent (calling twice unlikes).
 */
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  const { postId } = await params;

  // Anti-abuse: 60 likes/min — generous but stops scripted bots
  const ip = clientIp(request.headers);
  const rl = await rateLimit(`like:${user.userId}:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequestsResponse(rl);

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, clubId: true },
    });
    if (!post) return notFound("post not found");

    // Only members can like (prevents drive-by spam)
    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: user.userId, clubId: post.clubId } },
      select: { id: true },
    });
    if (!membership) return forbidden("Debes unirte al club");

    const existing = await (prisma as any).postLike.findUnique({
      where: { userId_postId: { userId: user.userId, postId } },
    });

    if (existing) {
      await (prisma as any).postLike.delete({ where: { id: existing.id } });
    } else {
      await (prisma as any).postLike.create({
        data: { userId: user.userId, postId },
      });
    }

    const count = await (prisma as any).postLike.count({ where: { postId } });
    return NextResponse.json({ liked: !existing, likesCount: count });
  } catch (error) {
    return apiError(error, 500, "like toggle failed");
  }
}
