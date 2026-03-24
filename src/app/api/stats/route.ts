
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [userCount, bookCount, readingCount, classCount] = await prisma.$transaction([
      prisma.user.count(),
      prisma.book.count(),
      prisma.userBook.count(),
      prisma.class.count(),
    ]);

    return NextResponse.json({
      users: userCount,
      books: bookCount,
      readings: readingCount,
      classes: classCount
    });
  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
