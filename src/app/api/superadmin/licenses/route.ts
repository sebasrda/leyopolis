import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/access";
import { buildLicenseSummary } from "@/lib/licenses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const institutionId = searchParams.get("institutionId");

  const summary = await buildLicenseSummary({
    institutionId: institutionId === "all" || !institutionId ? undefined : institutionId,
  });

  return NextResponse.json(summary, {
    headers: { "Cache-Control": "no-store" },
  });
}
