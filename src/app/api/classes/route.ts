
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !("id" in session.user)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    const classes = await prisma.class.findMany({
      where: {
        teacherId: userId
      },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !("id" in session.user)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const userId = (session.user as any).id;
    
    const newClass = await prisma.class.create({
      data: {
        name,
        teacherId: userId
      }
    });

    return NextResponse.json(newClass);
  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
