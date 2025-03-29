import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    let userId = 'test-user';
    
    // In production, verify authentication using Clerk
    if (process.env.NODE_ENV === 'production') {
      const session = await auth();
      if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.userId;
    }

    // Get file data from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get file extension
    const filename = file.name;
    const extension = filename.split('.').pop() || '';
    
    // Create a unique filename
    const blobName = `transcribe/${userId}/${Date.now()}.${extension}`;
    
    // Upload to Vercel Blob
    const blob = await put(blobName, file, {
      access: 'public',
      contentType: file.type,
    });
    
    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
} 