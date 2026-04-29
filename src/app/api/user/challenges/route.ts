import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const week = parseInt(searchParams.get("week") || "0");
    const userId = (session.user as any).id;

    try {
        // Weekly challenges (for UI state)
        const claimed = await prisma.userChallenge.findMany({
            where: { userId, weekNumber: week }
        });

        // Total historical count (for stats widget)
        const totalClaimed = await prisma.userChallenge.count({
            where: { userId }
        });

        // Return as a Record<number, boolean> + totalClaimed
        const claimedMap = claimed.reduce((acc, curr) => {
            acc[curr.challengeId] = true;
            return acc;
        }, {} as Record<number, boolean>);

        return NextResponse.json({ ...claimedMap, __totalClaimed: totalClaimed });
    } catch (error) {
        console.error("Error fetching claimed challenges:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { challengeId, weekNumber, xp } = await req.json();

        // 1. Mark as claimed in DB
        await prisma.userChallenge.create({
            data: {
                userId: (session.user as any).id,
                challengeId: parseInt(challengeId),
                weekNumber: parseInt(weekNumber)
            }
        });

        // 2. Add XP to user
        await prisma.user.update({
            where: { id: (session.user as any).id },
            data: {
                xp: { increment: xp }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        // Handle unique constraint if already claimed
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Challenge already claimed" }, { status: 400 });
        }
        console.error("Error claiming challenge:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
