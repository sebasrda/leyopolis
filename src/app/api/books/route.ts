import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isDemoMode } from "@/lib/access";

import { normalizeGrade } from '@/lib/grades';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");

    const where: any = {};
    if (grade) {
      const normalized = normalizeGrade(grade);
      where.grade = normalized;
    }
    if (subject) where.subject = subject;

    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const isSuperAdmin = userRole === "SUPERADMIN";
    const userId = (session?.user as any)?.id;

    let restricted = false;
    let assignedBookIds: string[] = [];

    if (userId && !isSuperAdmin) {
      const dbUser = await (prisma as any).user.findUnique({
        where: { id: userId },
        include: { 
          institution: { select: { isLibraryRestricted: true } },
          enrolledClasses: { include: { assignedBooks: { select: { id: true } } } }
        }
      });
      if (dbUser?.institution?.isLibraryRestricted) restricted = true;
      if (dbUser?.enrolledClasses) {
        dbUser.enrolledClasses.forEach((cls: any) => {
           if (cls.assignedBooks) {
             cls.assignedBooks.forEach((b: any) => {
               if (!assignedBookIds.includes(b.id)) assignedBookIds.push(b.id);
             });
           }
        });
      }
    }

    if (!isDemoMode() && !isSuperAdmin) {
      where.isDemo = false;
    }

    // Apply strict restriction
    if (restricted && !isSuperAdmin) {
      where.id = { in: assignedBookIds };
      // Opcional: si la institución tiene `gradeCollections` permitidas globales, podrían unirse aquí en el `in`, 
      // pero requerimiento dice: "dejar limitado el colegio a los que se elijan". Usaremos las unidades asignadas por ahora.
    }

    const books = await (prisma as any).book.findMany({
      where,
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        coverImage: true,
        category: true,
        language: true,
        difficulty: true,
        format: true,
        contentUrl: true,
        createdAt: true,
        updatedAt: true,
        published: true,
        ageRange: true,
        grade: true,
        isDemo: true,
        quizId: true,
        subject: true,
        allowMultipleAttempts: true,
        passScore: true,
        displaySettings: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const booksWithQuiz = books.map((b: any) => ({
      ...b,
      hasQuiz: !!b.quizId,
      isAssigned: assignedBookIds.includes(b.id)
    }));

    if (!isSuperAdmin) {
       booksWithQuiz.sort((a: any, b: any) => {
         if (a.isAssigned && !b.isAssigned) return -1;
         if (!a.isAssigned && b.isAssigned) return 1;
         return 0; 
       });
    }

    return NextResponse.json(booksWithQuiz);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json({ error: 'Error al obtener libros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === "ADMIN" || userRole === "SUPERADMIN";

  if (!session?.user || !isAuthorized) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const book = await (prisma.book as any).create({
      data: {
        title: body.title,
        author: body.author,
        description: body.description,
        coverImage: body.coverImage,
        category: body.category,
        language: body.language || "Español",
        difficulty: body.difficulty,
        format: body.format || "PDF",
        contentUrl: body.contentUrl,
        grade: body.grade || null,
        subject: body.subject || null,
        ageRange: body.ageRange || null,
      }
    });
    return NextResponse.json(book);
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json({ error: 'Error al crear libro' }, { status: 500 });
  }
}



