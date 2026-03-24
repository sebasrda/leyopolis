import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "clt_demo_user_001";

export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userDb = prisma as unknown as {
    user: { findUnique: (args: unknown) => Promise<{ grade: string | null; institutionId: string | null } | null> };
    bookCollectionByGrade: { findMany: (args: unknown) => Promise<any[]> };
    userBook: { upsert: (args: unknown) => Promise<unknown> };
  };

  const me = await userDb.user.findUnique({
    where: { id: user.userId },
    select: { grade: true, institutionId: true },
  });

  const grade = me?.grade?.trim() || null;
  const institutionId = me?.institutionId || null;

  if (!grade) return NextResponse.json({ grade: null, books: [] });

  const collections = await userDb.bookCollectionByGrade.findMany({
    where: {
      grade,
      OR: [{ institutionId }, { institutionId: null }],
    },
    include: { books: { include: { book: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const bookMap = new Map<string, any>();
  for (const c of collections) {
    for (const row of c.books || []) {
      if (row.book?.id) bookMap.set(row.book.id, row.book);
    }
  }

  const books = Array.from(bookMap.values());

  if (user.userId !== DEMO_USER_ID) {
    await Promise.all(
      books.map((b: any) =>
        userDb.userBook.upsert({
          where: { userId_bookId: { userId: user.userId, bookId: b.id } },
          update: {},
          create: { userId: user.userId, bookId: b.id, progress: 0, status: "IN_PROGRESS", lastRead: new Date() },
        })
      )
    );
  }

  return NextResponse.json({ grade, books });
}

