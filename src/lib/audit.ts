import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/ratelimit";

/**
 * Append an immutable record to the audit log.
 *
 * Failures are logged but never thrown — auditing should never break the
 * underlying business operation. If you can't log, you still need to act.
 */
export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  request?: Request;
  metadata?: Record<string, unknown>;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const ip = entry.request ? clientIp(entry.request.headers) : null;
    const ua = entry.request?.headers.get("user-agent") || null;

    await (prisma as any).auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        actorRole: entry.actorRole ?? null,
        action: entry.action,
        resource: entry.resource ?? null,
        resourceId: entry.resourceId ?? null,
        ip,
        userAgent: ua,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write audit log:", e, { entry });
  }
}

// Predefined action constants — use these to keep the log queryable
export const AUDIT_ACTIONS = {
  // Auth
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_LOCKED: "LOGIN_LOCKED",
  TWO_FACTOR_ENABLED: "TWO_FACTOR_ENABLED",
  TWO_FACTOR_DISABLED: "TWO_FACTOR_DISABLED",
  TWO_FACTOR_VERIFIED: "TWO_FACTOR_VERIFIED",
  TWO_FACTOR_FAILED: "TWO_FACTOR_FAILED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  // User management
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  USER_ROLE_CHANGE: "USER_ROLE_CHANGE",
  USER_LICENSE_RENEW: "USER_LICENSE_RENEW",
  USER_SUSPEND: "USER_SUSPEND",
  // Content
  BOOK_CREATE: "BOOK_CREATE",
  BOOK_UPDATE: "BOOK_UPDATE",
  BOOK_DELETE: "BOOK_DELETE",
  ACTIVITY_CREATE: "ACTIVITY_CREATE",
  ACTIVITY_DELETE: "ACTIVITY_DELETE",
  // Institution / classes
  INSTITUTION_CREATE: "INSTITUTION_CREATE",
  INSTITUTION_UPDATE: "INSTITUTION_UPDATE",
  INSTITUTION_DELETE: "INSTITUTION_DELETE",
  CLASS_CREATE: "CLASS_CREATE",
  CLASS_UPDATE: "CLASS_UPDATE",
  CLASS_DELETE: "CLASS_DELETE",
  ASSIGNMENT_CREATE: "ASSIGNMENT_CREATE",
  ASSIGNMENT_DELETE: "ASSIGNMENT_DELETE",
  // System
  SYSTEM_SETTING_UPDATE: "SYSTEM_SETTING_UPDATE",
} as const;
