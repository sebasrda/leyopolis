import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = prisma as unknown as any;
  const password = await bcrypt.hash("demo1234", 10);

  const institution = await db.institution.upsert({
    where: { domain: "demo.edu" },
    update: { name: "Instituto Educativo Demo" },
    create: {
      name: "Instituto Educativo Demo",
      domain: "demo.edu",
      city: "Ciudad Demo",
      country: "País Demo",
    },
  });

  const [coordinator, teacher, student] = await Promise.all([
    db.user.upsert({
      where: { email: "coordinador@demo.edu" },
      update: { role: "COORDINATOR", institutionId: institution.id },
      create: {
        name: "Coordinador Demo",
        email: "coordinador@demo.edu",
        password,
        role: "COORDINATOR",
        institutionId: institution.id,
      },
    }),
    db.user.upsert({
      where: { email: "profesor@demo.edu" },
      update: { role: "TEACHER", institutionId: institution.id },
      create: {
        name: "Profesor Demo",
        email: "profesor@demo.edu",
        password,
        role: "TEACHER",
        institutionId: institution.id,
      },
    }),
    db.user.upsert({
      where: { email: "estudiante@demo.edu" },
      update: { role: "STUDENT", institutionId: institution.id, grade: "Grado 8" },
      create: {
        name: "Estudiante Demo",
        email: "estudiante@demo.edu",
        password,
        role: "STUDENT",
        institutionId: institution.id,
        grade: "Grado 8",
      },
    }),
  ]);

  const existingCollections = await db.bookCollectionByGrade.findMany({
    where: { institutionId: institution.id, grade: "Grado 8" },
    take: 5,
    include: { books: true },
  });

  let collection = existingCollections[0];
  if (!collection) {
    collection = await db.bookCollectionByGrade.create({
      data: { institutionId: institution.id, grade: "Grado 8", name: "Literatura juvenil" },
    });
  }

  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true },
  });

  await Promise.all(
    books.map((b) =>
      db.bookCollectionByGradeBook.upsert({
        where: { collectionId_bookId: { collectionId: collection.id, bookId: b.id } },
        update: {},
        create: { collectionId: collection.id, bookId: b.id },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    institution: { id: institution.id, domain: institution.domain },
    users: [
      { id: coordinator.id, email: coordinator.email, role: coordinator.role },
      { id: teacher.id, email: teacher.email, role: teacher.role },
      { id: student.id, email: student.email, role: student.role, grade: student.grade },
    ],
  });
}
