import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { apiError, unauthorized } from "@/lib/apiError";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=<query>&limit=<N>
 *
 * Universal search endpoint for the global header search bar. Returns books
 * whose title OR author matches the query (case-insensitive, partial).
 *
 * Scoped per institution when applicable, with the same library-restriction
 * rules as /api/books.
 */
export async function GET(request: Request) {
  const user = await getUserIdAndRole();
  if (!user) return unauthorized();

  // Rate limit: 60 searches/min per user — enough for typing, blocks scraping
  const ip = clientIp(request.headers);
  const rl = await rateLimit(`search:${user.userId}:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequestsResponse(rl);

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") || 8)));

    if (q.length < 2) {
      return NextResponse.json({ books: [] });
    }

    // Institution scoping (same logic as /api/books)
    const dbUser = await (prisma as any).user.findUnique({
      where: { id: user.userId },
      include: {
        institution: { select: { isLibraryRestricted: true } },
        enrolledClasses: { include: { assignedBooks: { select: { id: true } } } },
      },
    });

    const isSuperAdmin = user.role === "SUPERADMIN";
    const restricted = !!dbUser?.institution?.isLibraryRestricted;
    const assignedIds: string[] = [];
    if (dbUser?.enrolledClasses) {
      for (const cls of dbUser.enrolledClasses) {
        for (const b of (cls.assignedBooks || [])) {
          if (!assignedIds.includes(b.id)) assignedIds.push(b.id);
        }
      }
    }

    // Build the WHERE: match title or author, with optional restriction
    const where: any = {
      published: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { author: { contains: q, mode: "insensitive" } },
      ],
    };

    // Restricted institutions only see their assigned books, unless they're
    // superadmin (who sees everything).
    if (restricted && !isSuperAdmin) {
      where.id = { in: assignedIds.length > 0 ? assignedIds : ["__none__"] };
    }

    const books = await prisma.book.findMany({
      where,
      take: limit,
      select: {
        id: true,
        title: true,
        author: true,
        coverImage: true,
      },
      orderBy: [
        // Prefer exact-prefix matches by sorting on title length proxy.
        // Postgres can't truly score relevance without a search index, but
        // this is good enough for an autocomplete dropdown.
        { title: "asc" },
      ],
    });

    return NextResponse.json({ books });
  } catch (error) {
    return apiError(error, 500, "search failed");
  }
}
