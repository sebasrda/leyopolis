import { authenticator } from "@otplib/preset-default";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// 30-second steps with ±1 window tolerance for clock skew
authenticator.options = {
  window: 1,
  step: 30,
};

const ISSUER = "Leyópolis";

export interface SetupResult {
  secret: string;
  otpauthUrl: string;
  recoveryCodes: string[];
}

/**
 * Begin 2FA enrollment: generates a fresh secret + recovery codes.
 * The secret is stored unencrypted in the DB but it's a low-value
 * secret on its own — it only matters in combination with the user's
 * password. Recovery codes are bcrypt-hashed before storage.
 */
export async function setupTwoFactor(userId: string, accountLabel: string): Promise<SetupResult> {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(accountLabel, ISSUER, secret);

  // 8 single-use recovery codes (8 chars each, alphanumeric, easy to type)
  const recoveryCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    recoveryCodes.push(randomBytes(6).toString("base64url").slice(0, 10).toUpperCase());
  }
  const hashedCodes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10)));

  await (prisma as any).twoFactor.upsert({
    where: { userId },
    create: {
      userId,
      secret,
      enabled: false,
      recoveryCodes: hashedCodes.join("\n"),
    },
    update: {
      secret,
      enabled: false,
      recoveryCodes: hashedCodes.join("\n"),
    },
  });

  return { secret, otpauthUrl, recoveryCodes };
}

/**
 * Confirm enrollment: user submits the first valid 6-digit code from their
 * authenticator app, we mark 2FA as enabled.
 */
export async function confirmTwoFactor(userId: string, token: string): Promise<boolean> {
  const tf = await (prisma as any).twoFactor.findUnique({ where: { userId } });
  if (!tf) return false;
  if (!verifyTotp(tf.secret, token)) return false;

  await (prisma as any).twoFactor.update({
    where: { userId },
    data: { enabled: true, enabledAt: new Date(), lastVerifiedAt: new Date() },
  });
  return true;
}

/** Returns true if the user has 2FA fully enabled */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const tf = await (prisma as any).twoFactor.findUnique({
    where: { userId },
    select: { enabled: true },
  });
  return !!tf?.enabled;
}

/**
 * Verify a TOTP code OR a one-time recovery code. If a recovery code is
 * consumed it is removed from the user's list.
 */
export async function verifyTwoFactor(userId: string, token: string): Promise<boolean> {
  const tf = await (prisma as any).twoFactor.findUnique({ where: { userId } });
  if (!tf || !tf.enabled) return false;

  // First try TOTP
  if (token.length === 6 && /^\d{6}$/.test(token) && verifyTotp(tf.secret, token)) {
    await (prisma as any).twoFactor.update({
      where: { userId },
      data: { lastVerifiedAt: new Date() },
    });
    return true;
  }

  // Fall back to recovery code
  const codeUpper = token.trim().toUpperCase();
  if (codeUpper.length >= 8) {
    const codes: string[] = (tf.recoveryCodes || "").split("\n").filter(Boolean);
    for (let i = 0; i < codes.length; i++) {
      const match = await bcrypt.compare(codeUpper, codes[i]!);
      if (match) {
        // Single-use: remove the consumed code
        codes.splice(i, 1);
        await (prisma as any).twoFactor.update({
          where: { userId },
          data: {
            recoveryCodes: codes.join("\n"),
            lastVerifiedAt: new Date(),
          },
        });
        return true;
      }
    }
  }
  return false;
}

/** Disable 2FA (requires fresh verification before calling) */
export async function disableTwoFactor(userId: string): Promise<void> {
  await (prisma as any).twoFactor.delete({ where: { userId } });
}

function verifyTotp(secret: string, token: string): boolean {
  try {
    return authenticator.check(token, secret);
  } catch {
    return false;
  }
}

/**
 * Should this role be REQUIRED to have 2FA? We enforce only on privileged
 * roles to avoid lockout drama for students/teachers in the field.
 */
export function isTwoFactorRequiredForRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}
