import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { apiError, notFound, unauthorized } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/**
 * GET /api/community/clubs/[clubId]
 * Returns the club detail with posts, like counts, comments counts, and
 * a `liked` flag for each post that reflects the current user's state.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  const { clubId } = await params;

  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        _count: { select: { members: true } },
        members: { where: { userId: user.userId }, select: { id: true, role: true } },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { comments: true, likes: true } },
            likes: { where: { userId: user.userId }, select: { id: true } },
          },
        },
      },
    });

    if (!club) return notFound("club not found");

    return NextResponse.json({
      id: club.id,
      name: club.name,
      description: club.description,
      coverImage: club.coverImage,
      membersCount: club._count.members,
      isMember: club.members.length > 0,
      myRole: club.members[0]?.role || null,
      posts: club.posts.map((post) => ({
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        author: post.user,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        liked: post.likes.length > 0,
        isMine: post.userId === user.userId,
      })),
    });
  } catch (error) {
    return apiError(error, 500, "fetch club detail failed");
  }
}
