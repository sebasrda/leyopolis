import { prisma } from "@/lib/prisma";

/**
 * License analytics built directly off the User table — no schema migration
 * required. A "license activation" is a User.createdAt event; an "active
 * license" is a non-demo user with isActive=true and (expiresAt > now OR null).
 */

export interface LicenseDailyPoint {
  date: string;       // YYYY-MM-DD
  count: number;      // activations registered that day
}

export interface LicenseRecentRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  licenseType: string;
  createdAt: string;          // ISO
  institutionId: string | null;
  institutionName: string | null;
  isActive: boolean;
  expiresAt: string | null;
}

export interface LicenseSummary {
  totalActive: number;
  totalAllTime: number;
  activatedToday: number;
  activated7Days: number;
  activated30Days: number;
  byInstitution: Array<{
    institutionId: string | null;
    institutionName: string;
    active: number;
    activatedToday: number;
  }>;
  daily: LicenseDailyPoint[];   // 30 most recent days, oldest first
  recent: LicenseRecentRow[];   // 50 most recent activations (newest first)
  generatedAt: string;          // ISO timestamp the report was built
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function buildLicenseSummary(opts: { institutionId?: string | null } = {}): Promise<LicenseSummary> {
  const now = new Date();
  const today = startOfDay(now);
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 29 * 86400000);

  // Scope filter: super admin sees all when institutionId is undefined; pass
  // an explicit string to scope to one institution, or null to include only
  // users without an institution.
  const scopeWhere: any = {
    isDemo: false,
  };
  if (opts.institutionId !== undefined) {
    scopeWhere.institutionId = opts.institutionId;
  }

  // ── Counters ────────────────────────────────────────────────────────────
  const [
    totalAllTime,
    totalActive,
    activatedToday,
    activated7Days,
    activated30Days,
    last30dRows,
    recentRows,
    institutions,
  ] = await Promise.all([
    prisma.user.count({ where: scopeWhere }),
    prisma.user.count({
      where: {
        ...scopeWhere,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.user.count({
      where: { ...scopeWhere, createdAt: { gte: today } },
    }),
    prisma.user.count({
      where: { ...scopeWhere, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.user.count({
      where: { ...scopeWhere, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.user.findMany({
      where: { ...scopeWhere, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: scopeWhere,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        licenseType: true,
        createdAt: true,
        institutionId: true,
        isActive: true,
        expiresAt: true,
        institution: { select: { id: true, name: true } },
      },
    }),
    // Per-institution breakdown only when not already scoped to one
    opts.institutionId === undefined
      ? prisma.institution.findMany({
          select: {
            id: true,
            name: true,
            _count: { select: { users: { where: { isActive: true, isDemo: false } } } },
            users: {
              where: { isDemo: false, createdAt: { gte: today } },
              select: { id: true },
            },
          },
        })
      : Promise.resolve([] as any[]),
  ]);

  // ── Daily bucket (30 days, oldest first, zero-filled) ──────────────────
  const buckets = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 86400000);
    buckets.set(isoDate(d), 0);
  }
  for (const r of last30dRows) {
    const k = isoDate(new Date(r.createdAt));
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const daily: LicenseDailyPoint[] = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));

  // ── Recent activations table ────────────────────────────────────────────
  const recent: LicenseRecentRow[] = recentRows.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    licenseType: u.licenseType,
    createdAt: u.createdAt.toISOString(),
    institutionId: u.institutionId,
    institutionName: u.institution?.name ?? null,
    isActive: u.isActive,
    expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
  }));

  // ── Per-institution roll-up ─────────────────────────────────────────────
  const byInstitution = institutions.map((i: any) => ({
    institutionId: i.id,
    institutionName: i.name,
    active: i._count?.users ?? 0,
    activatedToday: i.users?.length ?? 0,
  }));

  return {
    totalActive,
    totalAllTime,
    activatedToday,
    activated7Days,
    activated30Days,
    byInstitution,
    daily,
    recent,
    generatedAt: new Date().toISOString(),
  };
}
