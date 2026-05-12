import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/community/posts/[postId]
 * Only the post's author OR a TEACHER/COORDINATOR/ADMIN/SUPERADMIN can delete.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  const { postId } = await params;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });
    if (!post) return notFound("post not found");

    const isOwner = post.userId === user.userId;
    const isMod = ["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(user.role);

    if (!isOwner && !isMod) return forbidden("No puedes eliminar esta publicación");

    // Cascade: comments + likes
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { postId } }),
      (prisma as any).postLike.deleteMany({ where: { postId } }),
      prisma.post.delete({ where: { id: postId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 500, "delete post failed");
  }
}
