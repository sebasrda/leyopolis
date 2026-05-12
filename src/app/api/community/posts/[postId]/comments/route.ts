import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { apiError, badRequest, forbidden, notFound, unauthorized } from "@/lib/apiError";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_LEN = 1000;

/**
 * GET /api/community/posts/[postId]/comments
 */
export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  const { postId } = await params;

  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: c.user,
        isMine: c.userId === user.userId,
      })),
    );
  } catch (error) {
    return apiError(error, 500, "fetch comments failed");
  }
}

/**
 * POST /api/community/posts/[postId]/comments
 * Members-only.
 */
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  const { postId } = await params;

  // 30 comments/min per user
  const ip = clientIp(request.headers);
  const rl = await rateLimit(`comment:${user.userId}:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequestsResponse(rl);

  try {
    const { content: rawContent } = await request.json();
    const content = (rawContent || "").trim();
    if (!content) return badRequest("content required");
    if (content.length > MAX_LEN) return badRequest("content too long");

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, clubId: true },
    });
    if (!post) return notFound("post not found");

    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: user.userId, clubId: post.clubId } },
      select: { id: true },
    });
    if (!membership) return forbidden("Debes unirte al club");

    const comment = await prisma.comment.create({
      data: { content, postId, userId: user.userId },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.user,
      isMine: true,
    }, { status: 201 });
  } catch (error) {
    return apiError(error, 500, "create comment failed");
  }
}
