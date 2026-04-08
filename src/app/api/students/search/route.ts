import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export async function GET(req: Request) {
  try {
    const auth = await getUserIdAndRole();
    if (!auth) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // Get the teacher's institution
    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { institutionId: true, role: true }
    });

    // If teacher doesn't have an institution and is not SUPERADMIN, we can restrict search
    const institutionFilter = dbUser?.institutionId ? { institutionId: dbUser.institutionId } : {};

    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        ...institutionFilter,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } }
        ]
      },
      select: { id: true, name: true, email: true },
      take: 10
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Search students error:", error);
    return NextResponse.json({ message: "Error en búsqueda" }, { status: 500 });
  }
}
