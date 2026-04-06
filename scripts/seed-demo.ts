// scripts/seed-demo.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de modo demo...");

  // Creamos el colegio demo
  const eduDemo = await prisma.institution.upsert({
    where: { domain: "demo.leyopolis.com" },
    update: {},
    create: {
      name: "Colegio Demo Leyópolis",
      domain: "demo.leyopolis.com",
    },
  });
  console.log("Colegio demo creado:", eduDemo.name);

  // Hash password
  const hashedPassword = await bcrypt.hash("demo123", 10);

  // Default demo admins/users are not created here to avoid conflicts, or they are forced:
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.leyopolis.com" },
    update: { isDemo: true, institutionId: eduDemo.id },
    create: {
      email: "admin@demo.leyopolis.com",
      name: "Admin Demo",
      password: hashedPassword,
      role: "ADMIN",
      institutionId: eduDemo.id,
      isDemo: true,
    },
  });

  const teacher1 = await prisma.user.upsert({
    where: { email: "docente1@demo.leyopolis.com" },
    update: { isDemo: true, institutionId: eduDemo.id },
    create: {
      email: "docente1@demo.leyopolis.com",
      name: "Prof. María García",
      password: hashedPassword,
      role: "TEACHER",
      institutionId: eduDemo.id,
      isDemo: true,
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: "docente2@demo.leyopolis.com" },
    update: { isDemo: true, institutionId: eduDemo.id },
    create: {
      email: "docente2@demo.leyopolis.com",
      name: "Prof. Carlos Ruiz",
      password: hashedPassword,
      role: "TEACHER",
      institutionId: eduDemo.id,
      isDemo: true,
    },
  });

  console.log("Usuarios principales demo creados");

  // Clases
  const class1 = await prisma.class.create({
    data: {
      name: "Español 6to A",
      subject: "Español",
      grade: "6to",
      teacherId: teacher1.id,
      isDemo: true,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      name: "Ciencias 7mo B",
      subject: "Ciencias",
      grade: "7mo",
      teacherId: teacher2.id,
      isDemo: true,
    },
  });

  console.log("Clases demo creadas");

  // Alumnos
  for (let i = 1; i <= 5; i++) {
    const student = await prisma.user.upsert({
      where: { email: `estudiante${i}@demo.leyopolis.com` },
      update: { isDemo: true, institutionId: eduDemo.id, enrolledClasses: { connect: { id: class1.id } } },
      create: {
        email: `estudiante${i}@demo.leyopolis.com`,
        name: `Estudiante ${i} (Demo)`,
        password: hashedPassword,
        role: "STUDENT",
        grade: "6to",
        institutionId: eduDemo.id,
        isDemo: true,
        enrolledClasses: { connect: { id: class1.id } },
      },
    });
  }

  for (let i = 6; i <= 10; i++) {
    const student = await prisma.user.upsert({
      where: { email: `estudiante${i}@demo.leyopolis.com` },
      update: { isDemo: true, institutionId: eduDemo.id, enrolledClasses: { connect: { id: class2.id } } },
      create: {
        email: `estudiante${i}@demo.leyopolis.com`,
        name: `Estudiante ${i} (Demo)`,
        password: hashedPassword,
        role: "STUDENT",
        grade: "7mo",
        institutionId: eduDemo.id,
        isDemo: true,
        enrolledClasses: { connect: { id: class2.id } },
      },
    });
  }

  console.log("Estudiantes demo matriculados");
  console.log("✅ Proceso completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
