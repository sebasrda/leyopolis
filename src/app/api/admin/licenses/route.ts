import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { buildLicenseSummary } from "@/lib/licenses";

export const dynamic = "force-dynamic";

/**
 * Institution-scoped license analytics. ADMIN can only see their own school;
 * SUPERADMIN can call with ?institutionId=... to inspect any school (and an
 * absent param means "the school of the current admin").
 */
export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("institutionId");

  let institutionId: string | null = null;

  if (auth.user.role === "SUPERADMIN") {
    // Super admin can inspect any school by id, defaulting to "all" when
    // they hit this endpoint without specifying.
    if (requested && requested !== "all") {
      institutionId = requested;
    } else {
      // Without a filter, redirect them to the global view.
      const summary = await buildLicenseSummary({});
      return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
    }
  } else {
    // Plain ADMIN: lock to their own institution
    const me = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { institutionId: true },
    });
    if (!me?.institutionId) {
      return NextResponse.json(
        { message: "Tu cuenta de administrador no tiene una institución asignada." },
        { status: 400 },
      );
    }
    institutionId = me.institutionId;
  }

  const summary = await buildLicenseSummary({ institutionId });
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}
