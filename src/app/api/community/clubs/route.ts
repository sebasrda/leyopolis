import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { apiError, badRequest, forbidden, unauthorized } from "@/lib/apiError";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/community/clubs
 * List all clubs with member/post counts and `isMember` for the current user.
 */
export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  try {
    // Seed demo clubs the first time (no clubs exist yet)
    const clubsCount = await prisma.club.count();
    if (clubsCount === 0) {
      await prisma.club.createMany({
        data: [
          { name: "Club de Fantasía Épica", description: "Para los amantes de mundos mágicos, dragones y héroes legendarios.", coverImage: "https://placehold.co/800x300/4f46e5/fff?text=Fantasía" },
          { name: "Lectores de Clásicos", description: "Analizamos las obras maestras de la literatura universal.", coverImage: "https://placehold.co/800x300/7c3aed/fff?text=Clásicos" },
          { name: "Ciencia Ficción & Futuro", description: "Explorando el mañana a través de la tecnología y el espacio.", coverImage: "https://placehold.co/800x300/0ea5e9/fff?text=Sci-Fi" },
        ],
      });
    }

    const clubs = await prisma.club.findMany({
      include: {
        _count: { select: { members: true, posts: true } },
        members: { where: { userId: user.userId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      clubs.map((club) => ({
        id: club.id,
        name: club.name,
        description: club.description,
        coverImage: club.coverImage,
        membersCount: club._count.members,
        postsCount: club._count.posts,
        isMember: club.members.length > 0,
      })),
    );
  } catch (error) {
    return apiError(error, 500, "fetch clubs failed");
  }
}

/**
 * POST /api/community/clubs
 * Two responsibilities (kept on the same endpoint for backwards compat):
 *   - `action: "join" | "leave"`: toggle membership for the current user
 *   - `action: "create"`: create a new club (TEACHER/COORDINATOR/ADMIN/SUPERADMIN only)
 */
export async function POST(request: Request) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  // Rate limit: 30 community actions/min per user to prevent spam
  const ip = clientIp(request.headers);
  const rl = await rateLimit(`community:${user.userId}:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequestsResponse(rl);

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      if (!["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(user.role)) {
        return forbidden("Solo profesores y administradores pueden crear clubes");
      }
      const name = (body.name || "").trim();
      const description = (body.description || "").trim();
      if (!name || name.length < 3 || name.length > 80) {
        return badRequest("El nombre debe tener entre 3 y 80 caracteres");
      }
      if (description.length > 500) {
        return badRequest("La descripción no puede exceder 500 caracteres");
      }
      const coverImage = typeof body.coverImage === "string" && body.coverImage.startsWith("http")
        ? body.coverImage
        : `https://placehold.co/800x300/4f46e5/fff?text=${encodeURIComponent(name.slice(0, 20))}`;

      const club = await prisma.club.create({
        data: { name, description, coverImage },
      });
      // Auto-add creator as MODERATOR
      await prisma.clubMember.create({
        data: { userId: user.userId, clubId: club.id, role: "MODERATOR" },
      });
      return NextResponse.json({ id: club.id, name: club.name }, { status: 201 });
    }

    // join / leave
    const { clubId } = body;
    if (!clubId || typeof clubId !== "string") return badRequest("clubId required");

    if (action === "join") {
      await prisma.clubMember.upsert({
        where: { userId_clubId: { userId: user.userId, clubId } },
        create: { userId: user.userId, clubId },
        update: {},
      });
    } else if (action === "leave") {
      await prisma.clubMember.deleteMany({
        where: { userId: user.userId, clubId },
      });
    } else {
      return badRequest("invalid action");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 500, "community action failed");
  }
}
