import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded demo user for prototype
const DEMO_USER_ID = "clt_demo_user_001";

export async function GET(request: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  
  try {
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: {
            _count: {
                select: { members: true }
            },
            members: {
                where: { userId: DEMO_USER_ID }
            },
            posts: {
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    },
                    _count: {
                        select: { comments: true }
                    }
                }
            }
        }
    });

    if (!club) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const formattedClub = {
        id: club.id,
        name: club.name,
        description: club.description,
        coverImage: club.coverImage,
        membersCount: club._count.members,
        isMember: club.members.length > 0,
        posts: club.posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            author: post.user,
            commentsCount: post._count.comments
        }))
    };
    
    return NextResponse.json(formattedClub);
  } catch (error) {
    console.error("Error fetching club details:", error);
    return NextResponse.json({ error: 'Failed to fetch club details' }, { status: 500 });
  }
}
