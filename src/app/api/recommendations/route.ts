
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // For demo purposes, we allow fetching recommendations without strict session if we have a demo user concept,
  // but ideally we need a user ID. 
  // If no session, we return generic top rated books.
  
  const userId = session?.user?.id || "demo-user-123"; // Fallback to demo user for now to keep app working

  try {
    // 1. Get IDs of books the user has already started/read
    const userBooks = await prisma.userBook.findMany({
      where: { userId: userId },
      select: { bookId: true }
    });

    const readBookIds = userBooks.map(ub => ub.bookId);

    // 2. Find books NOT in that list (Recommendations)
    // We can limit to 3-5 recommendations
    const recommendations = await prisma.book.findMany({
      where: {
        id: { notIn: readBookIds },
        published: true, // Only published books
      },
      take: 4,
      orderBy: {
        // Simple strategy: newest or by rating (if we had it)
        createdAt: 'desc' 
      }
    });

    // If user has read everything (or no books exist), we might return empty or some default
    return NextResponse.json(recommendations);

  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
