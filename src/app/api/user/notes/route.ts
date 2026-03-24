import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Hardcoded demo user for prototype
const DEMO_USER_ID = "clt_demo_user_001";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || DEMO_USER_ID;

  if (userId === DEMO_USER_ID) {
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        name: "Estudiante Demo",
        email: "demo@leyopolis.edu",
        role: "STUDENT",
      },
    });
  }

  return userId;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    
    const note = await prisma.note.create({
      data: {
        userId,
        text: body.text,
        page: body.page,
        bookTitle: body.bookTitle,
        quote: body.quote
        // bookId is optional now, so we can skip it if not provided
      }
    });
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const userId = await getUserId();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const note = await prisma.note.findUnique({ where: { id } });
        if (!note || note.userId !== userId) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.note.delete({ where: { id } });
        
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
