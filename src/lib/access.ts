import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type AppRole = "SUPERADMIN" | "ADMIN" | "COORDINATOR" | "TEACHER" | "STUDENT";

const VALID_ROLES: AppRole[] = ["SUPERADMIN", "ADMIN", "COORDINATOR", "TEACHER", "STUDENT"];

export async function getUserIdAndRole() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const sessionRole = session?.user?.role;
  if (sessionRole && VALID_ROLES.includes(sessionRole as AppRole)) {
    return { userId, role: sessionRole as AppRole };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const role = dbUser?.role && VALID_ROLES.includes(dbUser.role as AppRole)
    ? (dbUser.role as AppRole)
    : "STUDENT";

  return { userId, role };
}

/** Returns user or a 401/403 NextResponse */
export async function requireRole(...allowedRoles: AppRole[]) {
  const user = await getUserIdAndRole();
  if (!user) {
    return { error: NextResponse.json({ message: "No autorizado" }, { status: 401 }) };
  }
  if (user.role === "SUPERADMIN") {
    return { user };
  }
  if (!allowedRoles.includes(user.role)) {
    return { error: NextResponse.json({ message: "Acceso denegado para tu rol" }, { status: 403 }) };
  }
  return { user };
}

export async function requireSuperAdmin() {
  return requireRole("SUPERADMIN");
}

export async function requireAdmin() {
  return requireRole("SUPERADMIN", "ADMIN");
}

export async function requireTeacher() {
  return requireRole("SUPERADMIN", "ADMIN", "COORDINATOR", "TEACHER");
}

export async function requireStudent() {
  return requireRole("SUPERADMIN", "ADMIN", "COORDINATOR", "TEACHER", "STUDENT");
}

/** Check if the current environment has demo mode enabled */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
