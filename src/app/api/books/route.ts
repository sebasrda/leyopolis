import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    return NextResponse.json(books);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const book = await prisma.book.create({
      data: {
        title: body.title,
        author: body.author,
        description: body.description,
        coverImage: body.coverImage,
        category: body.category,
        language: body.language,
        difficulty: body.difficulty,
        format: body.format,
        contentUrl: body.contentUrl
      }
    });
    return NextResponse.json(book);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
