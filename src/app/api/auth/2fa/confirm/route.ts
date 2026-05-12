import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { confirmTwoFactor } from "@/lib/twoFactor";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { apiError, badRequest, unauthorized } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") return badRequest("missing token");

    const userId = (session.user as any).id;
    const ok = await confirmTwoFactor(userId, token);
    if (!ok) {
      await audit({
        actorId: userId,
        actorEmail: session.user.email,
        actorRole: (session.user as any).role,
        action: AUDIT_ACTIONS.TWO_FACTOR_FAILED,
        resource: "User",
        resourceId: userId,
        request: req,
        metadata: { phase: "confirm" },
      });
      return NextResponse.json({ message: "Código inválido" }, { status: 400 });
    }

    await audit({
      actorId: userId,
      actorEmail: session.user.email,
      actorRole: (session.user as any).role,
      action: AUDIT_ACTIONS.TWO_FACTOR_ENABLED,
      resource: "User",
      resourceId: userId,
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, 500, "2fa confirm failed");
  }
}
