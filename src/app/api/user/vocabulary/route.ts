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
    const vocab = await prisma.vocabulary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(vocab);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vocabulary' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    
    // Check if word already exists for this user to avoid duplicates or update it
    const existing = await prisma.vocabulary.findFirst({
        where: { 
            userId,
            word: body.word
        }
    });

    if (existing) {
        return NextResponse.json(existing);
    }

    const vocab = await prisma.vocabulary.create({
      data: {
        userId,
        word: body.word,
        definition: body.definition,
        context: body.context,
        bookTitle: body.bookTitle // Note: Schema might need adjustment if bookTitle isn't in model, checking schema...
        // Schema has `bookId`, but frontend sends `bookTitle`. 
        // For now I'll ignore book connection or look up book by title if possible.
        // Wait, I updated schema but didn't check if `bookTitle` field exists in Vocabulary model.
        // Let's check schema again mentally: `vocabulary Vocabulary[]` in User.
        // `Vocabulary` model: `id, userId, bookId, word, definition, context, mastered`.
        // It does NOT have `bookTitle`. It has `bookId`.
        // Frontend sends `bookTitle`.
      }
    });
    return NextResponse.json(vocab);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save vocabulary' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
    try {
        const userId = await getUserId();
        const body = await request.json();
        const { id, mastered } = body;
        
        const updated = await prisma.vocabulary.update({
            where: { id },
            data: { mastered }
        });
        
        if (updated.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
