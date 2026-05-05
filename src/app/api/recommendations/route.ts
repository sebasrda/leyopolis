
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getWeekNumber() {
  const d = new Date();
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function GET() {
  try {
    const totalBooks = await prisma.book.count({ where: { published: true } });
    const weekNum = getWeekNumber();
    
    // Determine how many books to skip based on the week
    // Each week we show a different set if possible
    const takeCount = 12;
    const skipCount = totalBooks > takeCount ? (weekNum * 3) % (totalBooks - takeCount + 1) : 0;

    const recommendations = await (prisma as any).book.findMany({
      where: {
        published: true,
      },
      take: takeCount,
      skip: skipCount,
      orderBy: {
        title: 'asc' // Stable ordering
      }
    });

    // Recommendations only change weekly (skipCount depends on the ISO week),
    // so we can let edge / browser cache them aggressively.
    return NextResponse.json(recommendations, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}



