import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded demo user for prototype
const DEMO_USER_ID = "clt_demo_user_001";

export async function GET() {
  try {
    // Ensure demo clubs exist
    const clubsCount = await prisma.club.count();
    if (clubsCount === 0) {
        // Create initial clubs
        await prisma.club.createMany({
            data: [
                {
                    name: "Club de Fantasía Épica",
                    description: "Para los amantes de mundos mágicos, dragones y héroes legendarios.",
                    coverImage: "https://placehold.co/400x200?text=Fantasía"
                },
                {
                    name: "Lectores de Clásicos",
                    description: "Analizamos las obras maestras de la literatura universal.",
                    coverImage: "https://placehold.co/400x200?text=Clásicos"
                },
                {
                    name: "Ciencia Ficción & Futuro",
                    description: "Explorando el mañana a través de la tecnología y el espacio.",
                    coverImage: "https://placehold.co/400x200?text=Sci-Fi"
                }
            ]
        });
    }

    const clubs = await prisma.club.findMany({
      include: {
        _count: {
            select: { members: true, posts: true }
        },
        members: {
            where: { userId: DEMO_USER_ID }
        }
      }
    });

    const formattedClubs = clubs.map(club => ({
        id: club.id,
        name: club.name,
        description: club.description,
        coverImage: club.coverImage,
        membersCount: club._count.members,
        postsCount: club._count.posts,
        isMember: club.members.length > 0
    }));
    
    return NextResponse.json(formattedClubs);
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clubId, action } = body;

        if (action === 'join') {
            await prisma.clubMember.create({
                data: {
                    userId: DEMO_USER_ID,
                    clubId: clubId
                }
            });
        } else if (action === 'leave') {
            await prisma.clubMember.deleteMany({
                where: {
                    userId: DEMO_USER_ID,
                    clubId: clubId
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 });
    }
}
