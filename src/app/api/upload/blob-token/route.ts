import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Authenticate the user
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;
        const allowedRoles = ["ADMIN", "COORDINATOR", "SUPERADMIN"];

        if (!session?.user || !allowedRoles.includes(userRole)) {
          throw new Error('No autorizado para subir archivos directamente');
        }

        return {
          allowedContentTypes: [
            'application/pdf', 
            'image/jpeg', 
            'image/png', 
            'image/webp',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/json',
            'audio/mpeg',       // .mp3
            'audio/wav',        // .wav
            'audio/x-wav',      // .wav alternativo
            'audio/mp4',        // .m4a
            'audio/x-m4a',      // .m4a alternativo
            'audio/ogg',        // .ogg
          ],
          tokenPayload: JSON.stringify({
            userId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs on Vercel after the file is uploaded
        console.log('Blob upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 400 },
    );
  }
}
