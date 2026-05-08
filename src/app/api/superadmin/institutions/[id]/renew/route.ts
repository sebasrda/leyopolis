import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";

/**
 * Renew (extend) an institution's contract. Adds `additionalDays` to the
 * later of the current endDate or now, optionally updates plan and
 * maxStudents, and flips the status back to "activa".
 *
 * Only SUPERADMIN can call this.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body still valid */ }

  const additionalDays = Number(body.additionalDays ?? 0);
  if (!Number.isFinite(additionalDays) || additionalDays <= 0 || additionalDays > 3650) {
    return NextResponse.json(
      { message: "additionalDays debe ser un número entre 1 y 3650 (10 años)" },
      { status: 400 },
    );
  }

  const inst = await prisma.institution.findUnique({ where: { id } });
  if (!inst) {
    return NextResponse.json({ message: "Institución no encontrada" }, { status: 404 });
  }

  const now = new Date();
  // If the institution is still active, extend from its current endDate.
  // If it already expired (or has none), extend from today.
  const baseDate = inst.endDate && new Date(inst.endDate) > now ? new Date(inst.endDate) : now;
  const newEndDate = new Date(baseDate.getTime() + additionalDays * 86400000);

  const update: Record<string, any> = {
    endDate: newEndDate,
    status: "activa",
  };

  if (typeof body.plan === "string" && ["TRIAL", "MENSUAL", "ANUAL"].includes(body.plan)) {
    update.plan = body.plan;
  }
  if (body.maxStudents !== undefined) {
    const n = Number(body.maxStudents);
    if (Number.isFinite(n) && n > 0 && n <= 100000) {
      update.maxStudents = Math.round(n);
    }
  }

  const updated = await prisma.institution.update({
    where: { id },
    data: update,
  });

  return NextResponse.json({
    message: "Licencia renovada",
    institution: updated,
    addedDays: additionalDays,
    previousEndDate: inst.endDate,
    newEndDate,
  });
}
