import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { disableTwoFactor, verifyTwoFactor, isTwoFactorRequiredForRole } from "@/lib/twoFactor";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { apiError, badRequest, forbidden, unauthorized } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Admins / superadmins cannot disable their 2FA from this endpoint —
  // only a superadmin (acting on a different user) can do that.
  if (isTwoFactorRequiredForRole(role)) {
    return forbidden("Tu rol requiere 2FA. Contacta a un superadmin para desactivar.");
  }

  try {
    const { token } = await req.json();
    if (!token) return badRequest("missing token");

    // Require a fresh valid 2FA code before disabling
    const ok = await verifyTwoFactor(userId, token);
    if (!ok) return NextResponse.json({ message: "Código inválido" }, { status: 400 });

    await disableTwoFactor(userId);

    await audit({
      actorId: userId,
      actorEmail: session.user.email,
      actorRole: role,
      action: AUDIT_ACTIONS.TWO_FACTOR_DISABLED,
      resource: "User",
      resourceId: userId,
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, 500, "2fa disable failed");
  }
}
