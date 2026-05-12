import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setupTwoFactor } from "@/lib/twoFactor";
import { toDataURL as qrToDataURL } from "qrcode";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { apiError, unauthorized } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  try {
    const userId = (session.user as any).id;
    const email = session.user.email || userId;
    const { secret, otpauthUrl, recoveryCodes } = await setupTwoFactor(userId, email);
    const qr = await qrToDataURL(otpauthUrl);

    await audit({
      actorId: userId,
      actorEmail: session.user.email,
      actorRole: (session.user as any).role,
      action: "TWO_FACTOR_SETUP_STARTED",
      resource: "User",
      resourceId: userId,
      request: req,
    });

    return NextResponse.json({
      secret,             // user types this manually if QR doesn't work
      otpauthUrl,         // the deep-link to scan
      qrDataUrl: qr,      // base64 PNG
      recoveryCodes,      // ONLY shown once — user must store them
    });
  } catch (e) {
    return apiError(e, 500, "2fa setup failed");
  }
}
