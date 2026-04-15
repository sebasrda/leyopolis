import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

function generatePassword(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (userRole === "ADMIN") {
      const dbUser = await (prisma as any).user.findUnique({ where: { id: (session.user as any).id }, select: { institutionId: true } });
      if (dbUser?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    const users = await (prisma as any).user.findMany({
      where: {
        institutionId: id,
        ...(roleFilter ? { role: roleFilter } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        grade: true,
        lastActive: true,
        createdAt: true,
        licenseType: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Institution users GET error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (userRole === "ADMIN") {
      const dbUser = await (prisma as any).user.findUnique({ where: { id: (session.user as any).id }, select: { institutionId: true } });
      if (dbUser?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { name, email, role, grade, licenseType } = body;

    // Check limit if student
    if (role === "STUDENT") {
        const institution = await (prisma as any).institution.findUnique({ where: { id }, select: { maxStudents: true } });
        const studentCount = await (prisma as any).user.count({ where: { institutionId: id, role: "STUDENT" } });
        if (institution && studentCount >= institution.maxStudents) {
            return NextResponse.json({ message: "Límite de estudiantes superado para la institución" }, { status: 400 });
        }
    }

    const checkEmail = await (prisma as any).user.findUnique({ where: { email } });
    if (checkEmail) {
      return NextResponse.json({ message: "El email ya está registrado" }, { status: 400 });
    }

    // Auto generate password
    const plainPassword = generatePassword(6);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    let expiresAt: Date | null = null;
    let finalLicenseType = licenseType || "ACTIVATED";

    if (licenseType === "MENSUAL") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (licenseType === "TRIMESTRAL") {
      expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    } else if (licenseType === "ANUAL") {
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else if (licenseType === "DEMO") {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const newUser = await (prisma as any).user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "STUDENT",
        grade,
        institutionId: id,
        licenseType: finalLicenseType,
        ...(expiresAt && { expiresAt }),
      },
      select: {
          id: true,
          name: true,
          email: true,
          role: true,
          licenseType: true,
          expiresAt: true,
      }
    });

    return NextResponse.json({ user: newUser, plainPassword });
  } catch (error) {
    console.error("Institution users POST error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
