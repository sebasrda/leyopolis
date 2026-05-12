import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyTwoFactor } from "@/lib/twoFactor";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { apiError, badRequest, unauthorized } from "@/lib/apiError";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const STEP_UP_COOKIE = "leyo_2fa_verified";
const STEP_UP_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const userId = (session.user as any).id;
  const ip = clientIp(req.headers);

  // Rate limit: 10 attempts per minute per user to slow down code-guessing
  const rl = await rateLimit(`2fa:${userId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return tooManyRequestsResponse(rl, "Demasiados intentos. Espera un minuto.");

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") return badRequest("missing token");

    const ok = await verifyTwoFactor(userId, token);

    if (!ok) {
      await audit({
        actorId: userId,
        actorEmail: session.user.email,
        actorRole: (session.user as any).role,
        action: AUDIT_ACTIONS.TWO_FACTOR_FAILED,
        resource: "User",
        resourceId: userId,
        request: req,
        metadata: { ip, phase: "verify" },
      });
      return NextResponse.json({ message: "Código inválido" }, { status: 400 });
    }

    // Step-up cookie: marks the session as 2FA-verified for the next 12h.
    // Privileged endpoints can require this cookie to allow destructive ops.
    const cookieStore = await cookies();
    cookieStore.set(STEP_UP_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: STEP_UP_TTL_SECONDS,
    });

    await audit({
      actorId: userId,
      actorEmail: session.user.email,
      actorRole: (session.user as any).role,
      action: AUDIT_ACTIONS.TWO_FACTOR_VERIFIED,
      resource: "User",
      resourceId: userId,
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, 500, "2fa verify failed");
  }
}
