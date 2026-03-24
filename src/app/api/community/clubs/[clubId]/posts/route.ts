import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded demo user for prototype
const DEMO_USER_ID = "clt_demo_user_001";

export async function POST(request: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify membership
    const membership = await prisma.clubMember.findUnique({
        where: {
            userId_clubId: {
                userId: DEMO_USER_ID,
                clubId: clubId
            }
        }
    });

    if (!membership) {
        return NextResponse.json({ error: "You must be a member to post" }, { status: 403 });
    }

    const newPost = await prisma.post.create({
        data: {
            content,
            clubId,
            userId: DEMO_USER_ID
        },
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
    });

    // REWARD: Add XP for posting
    await prisma.user.update({
        where: { id: DEMO_USER_ID },
        data: {
            xp: { increment: 10 }
        }
    });

    const formattedPost = {
        id: newPost.id,
        content: newPost.content,
        createdAt: newPost.createdAt,
        author: newPost.user,
        commentsCount: newPost._count.comments
    };

    return NextResponse.json(formattedPost);
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
