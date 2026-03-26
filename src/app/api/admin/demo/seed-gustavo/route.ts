import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST() {
  const password = await bcrypt.hash("demo1234", 10);

  const demoUsers = [
    {
      email: "gustavo.estudiante@demo.com",
      name: "Gustavo Estudiante",
      role: "STUDENT",
      grade: "Grado 8",
      image: "https://ui-avatars.com/api/?name=Gustavo+Estudiante&background=4F46E5&color=fff",
    },
    {
      email: "gustavo.profesor@demo.com",
      name: "Gustavo Profesor",
      role: "TEACHER",
      image: "https://ui-avatars.com/api/?name=Gustavo+Profesor&background=059669&color=fff",
    },
    {
      email: "gustavo.coordinador@demo.com",
      name: "Gustavo Coordinador",
      role: "COORDINATOR",
      image: "https://ui-avatars.com/api/?name=Gustavo+Coordinador&background=D97706&color=fff",
    },
  ];

  const results = [];

  for (const u of demoUsers) {
    const user = await (prisma as any).user.upsert({
      where: { email: u.email },
      update: {
        password,
        role: u.role,
        name: u.name,
        image: u.image,
        ...(u.grade ? { grade: u.grade } : {}),
      },
      create: {
        name: u.name,
        email: u.email,
        password,
        role: u.role,
        image: u.image,
        ...(u.grade ? { grade: u.grade } : {}),
      },
    });
    results.push({ id: user.id, email: user.email, role: user.role });
  }

  return NextResponse.json({
    ok: true,
    message: "Demo users created/updated. Password: demo1234",
    users: results,
  });
}
