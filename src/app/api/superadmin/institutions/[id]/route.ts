import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Security check: if ADMIN, ensure they belong to this institution
    if (userRole === "ADMIN") {
      const dbUser = await (prisma as any).user.findUnique({ where: { id: (session.user as any).id }, select: { institutionId: true } });
      if (dbUser?.institutionId !== id) {
        return NextResponse.json({ message: "Requiere acceso a esta institución" }, { status: 403 });
      }
    }

    const institution = await (prisma as any).institution.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            classes: true,
          }
        }
      }
    });

    if (!institution) {
      return NextResponse.json({ message: "Institución no encontrada" }, { status: 404 });
    }

    return NextResponse.json(institution);
  } catch (error) {
    console.error("Institution detail GET error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Security check for ADMIN (Coordinators)
    if (userRole === "ADMIN") {
      const dbUser = await (prisma as any).user.findUnique({ where: { id: userId }, select: { institutionId: true } });
      if (dbUser?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado a esta institución" }, { status: 403 });
      }
    }

    const body = await req.json();
    const {
      name, domain, plan, maxStudents, status, isLibraryRestricted,
      motionTrackingEnabled, motionGamesEnabled, multiLanguageEnabled, maxBooks,
    } = body;

    const dataPayload: any = {};
    if (name !== undefined) dataPayload.name = name;
    if (domain !== undefined) dataPayload.domain = domain;
    if (plan !== undefined) dataPayload.plan = plan;
    if (maxStudents !== undefined) dataPayload.maxStudents = maxStudents;
    if (status !== undefined) dataPayload.status = status;
    if (isLibraryRestricted !== undefined) dataPayload.isLibraryRestricted = isLibraryRestricted;
    // ── Plan-feature toggles (set by superadmin on creation/edit) ──
    if (typeof motionTrackingEnabled === "boolean") dataPayload.motionTrackingEnabled = motionTrackingEnabled;
    if (typeof motionGamesEnabled === "boolean") dataPayload.motionGamesEnabled = motionGamesEnabled;
    if (typeof multiLanguageEnabled === "boolean") dataPayload.multiLanguageEnabled = multiLanguageEnabled;
    if (maxBooks !== undefined) dataPayload.maxBooks = Math.max(0, Number(maxBooks) || 0);

    const updated = await (prisma as any).institution.update({
      where: { id },
      data: dataPayload
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Institution update PUT error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
