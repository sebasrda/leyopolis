
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch stats for teacher's students
    // For now, fetching global stats as we don't have full student-teacher enrollment logic populated
    const totalReadings = await prisma.userBook.count();
    const completedReadings = await prisma.userBook.count({
      where: { status: "COMPLETED" }
    });
    
    const completionRate = totalReadings > 0 ? Math.round((completedReadings / totalReadings) * 100) : 0;
    
    // Students at risk (0 progress)
    const atRisk = await prisma.userBook.count({
      where: { progress: 0 }
    });

    // Calculate Average Time per Session
    const sessions = await prisma.readingSession.findMany({
      select: { durationSeconds: true }
    });
    
    let averageTimeStr = "0 min";
    if (sessions.length > 0) {
        const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
        const avgSeconds = Math.round(totalSeconds / sessions.length);
        const minutes = Math.floor(avgSeconds / 60);
        averageTimeStr = `${minutes} min`;
    }

    return NextResponse.json({
      completionRate,
      averageTime: averageTimeStr,
      atRisk,
      classPerformance: [
        { name: "Global", progress: completionRate }
      ]
    });
  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
