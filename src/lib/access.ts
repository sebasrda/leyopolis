import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AppRole = "ADMIN" | "COORDINATOR" | "TEACHER" | "STUDENT";

export async function getUserIdAndRole() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const sessionRole = session?.user?.role;
  if (sessionRole === "ADMIN" || sessionRole === "COORDINATOR" || sessionRole === "TEACHER" || sessionRole === "STUDENT") {
    return { userId, role: sessionRole as AppRole };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const role =
    dbUser?.role === "ADMIN" ||
    dbUser?.role === "COORDINATOR" ||
    dbUser?.role === "TEACHER" ||
    dbUser?.role === "STUDENT"
      ? (dbUser.role as AppRole)
      : "STUDENT";

  return { userId, role };
}
