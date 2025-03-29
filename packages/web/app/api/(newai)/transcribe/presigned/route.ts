import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from '@vercel/blob';

// Simulate a client upload pattern using server uploads
export async function POST(request: Request) {
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

    const { extension } = await request.json();
    if (!extension) {
      return NextResponse.json({ error: "Extension is required" }, { status: 400 });
    }

    const filename = `transcribe/${userId}/${Date.now()}.${extension}`;
    
    // Create a placeholder file to establish the URL
    const placeholder = Buffer.from('placeholder');
    const blob = await put(filename, placeholder, {
      access: 'public',
      contentType: `audio/${extension}`,
      addRandomSuffix: false, // Don't add random suffix so we can replace it
    });
    
    // For Azure Blob Storage (which Vercel Blob uses), we need to return the same URL
    // The client will use a PUT request to replace the placeholder
    return NextResponse.json({
      url: blob.url,
      uploadUrl: blob.url,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 