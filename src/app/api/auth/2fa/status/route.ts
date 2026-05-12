import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isTwoFactorEnabled, isTwoFactorRequiredForRole } from "@/lib/twoFactor";
import { unauthorized } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const enabled = await isTwoFactorEnabled(userId);

  return NextResponse.json({
    enabled,
    required: isTwoFactorRequiredForRole(role),
  });
}
