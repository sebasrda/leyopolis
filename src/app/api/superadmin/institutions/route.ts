import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  try {
    const institutions = await prisma.institution.findMany({
      include: {
        _count: {
          select: { users: { where: { role: "STUDENT" } }, classes: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    console.log(`[API] Fetched ${institutions.length} institutions for SuperAdmin`);

    // Auto-update expired trials/plans before returning
    const today = new Date();
    const updatedInstitutions = await Promise.all(institutions.map(async (inst) => {
      if (inst.endDate && new Date(inst.endDate) < today && inst.status !== "vencida") {
        return prisma.institution.update({
          where: { id: inst.id },
          data: { status: "vencida" },
          include: {
            _count: {
              select: { users: { where: { role: "STUDENT" } }, classes: true }
            }
          }
        });
      }
      return inst;
    }));

    return NextResponse.json(updatedInstitutions);
  } catch (error) {
    console.error("Error fetching institutions:", error);
    return NextResponse.json({ message: "Error al obtener colegios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const {
      name, domain, plan, maxStudents, durationDays,
      motionTrackingEnabled, motionGamesEnabled, maxBooks,
    } = body;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (durationDays || 30));

    const newInstitution = await (prisma as any).institution.create({
      data: {
        name,
        domain: domain.toLowerCase(),
        plan: plan || "TRIAL",
        status: "activa",
        maxStudents: maxStudents || 30,
        startDate,
        endDate,
        // Plan feature flags — default to all-enabled if the caller doesn't
        // provide them, so behaviour for old code paths stays identical.
        motionTrackingEnabled: typeof motionTrackingEnabled === "boolean" ? motionTrackingEnabled : true,
        motionGamesEnabled: typeof motionGamesEnabled === "boolean" ? motionGamesEnabled : true,
        maxBooks: maxBooks !== undefined ? Math.max(0, Number(maxBooks) || 0) : 220,
      }
    });

    return NextResponse.json(newInstitution, { status: 201 });
  } catch (error: any) {
    console.error("Error creating institution:", error);
    if (error.code === 'P2002') {
       return NextResponse.json({ message: "El dominio ya existe." }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al crear colegio" }, { status: 500 });
  }
}



