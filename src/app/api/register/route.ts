
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password, role, grade } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    const userDb = prisma as unknown as {
      user: {
        findUnique: (args: unknown) => Promise<{ id: string } | null>;
        create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; email: string | null; name: string | null }>;
      };
      institution: {
        findUnique: (args: unknown) => Promise<{ id: string } | null>;
      };
    };

    const existingUser = await userDb.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "El usuario ya existe" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailLower = String(email).toLowerCase();
    const domain = emailLower.includes("@") ? emailLower.split("@")[1]!.trim().toLowerCase() : "";
    const institution = domain ? await userDb.institution.findUnique({ where: { domain }, select: { id: true } }) : null;

    const roleRaw = typeof role === "string" ? role : undefined;
    const normalizedRole =
      roleRaw === "ADMIN" || roleRaw === "COORDINATOR" || roleRaw === "TEACHER" || roleRaw === "STUDENT"
        ? roleRaw
        : "STUDENT";
    const gradeValue = typeof grade === "string" ? grade.trim() : undefined;

    const user = await userDb.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: normalizedRole,
        grade: gradeValue,
        institutionId: institution?.id ?? undefined,
      },
    });

    return NextResponse.json(
      { message: "Usuario creado exitosamente", user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
