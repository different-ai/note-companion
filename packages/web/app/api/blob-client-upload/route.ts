import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
// Use the standard auth helper and clerkClient
import { auth, clerkClient } from '@clerk/nextjs/server';

// Import your database interaction logic and processing function
// Example: import { processUploadedBlob } from '@/utils/file-processing';
// Example: import { db } from '@/drizzle/db';
// Example: import { uploadsTable } from '@/drizzle/schema';

export async function POST(request: Request): Promise<NextResponse> {
  // Capture userId from the initial authenticated request
  const { userId } = await auth(); 
  if (!userId) {
    // Should be handled by Clerk middleware, but double-check
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log(`Initial request authenticated for User ID: ${userId}`);

  // Parse the body ONCE, as it's needed by handleUpload options type.
  const body = (await request.json()) as HandleUploadBody;

  // We won't clone the request for this approach

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      
      // Use the userId captured from the initial authenticated request
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // We trust the userId obtained from auth() at the start of the POST handler.
        // The clientPayload might contain the token, but we rely on the initial auth.
        console.log(`Generating blob token for user: ${userId}`);
        console.log(`Received clientPayload: ${clientPayload}`); // Log payload for debugging

        // Optional: Add any other server-side authorization checks if needed
        // Example: Check user's subscription status or permissions
        // const user = await clerkClient.users.getUser(userId); 
        // if (user.privateMetadata?.role !== 'admin') { 
        //   throw new Error('User does not have permission to upload');
        // }

        // Generate the token with necessary payload including the verified userId
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/markdown',
            'text/plain',
          ],
          maximumFileSizeInBytes: 100 * 1024 * 1024, // 100MB
          tokenPayload: JSON.stringify({
            // Include the verified userId in the token payload
            userId: userId, 
            // Optionally include data from clientPayload if needed downstream
            // clientData: clientPayload ? JSON.parse(clientPayload) : null 
          }),
          validForSeconds: 3600, // 1 hour
        };
      },
      // Handle the upload completion
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // The blob and tokenPayload are correctly populated by handleUpload
        console.log('Client blob upload completed:', blob.pathname, blob.url);
        const { userId } = JSON.parse(tokenPayload);

        // --- Replace with your actual processing logic ---
        try {
          // 1. (Optional) Record the upload in your database immediately
          // Example: await db.insert(uploadsTable).values({
          //   userId: userId,
          //   blobUrl: blob.url,
          //   blobPathname: blob.pathname,
          //   originalFilename: blob.pathname, // Or pass original name via clientPayload
          //   status: 'processing',
          //   uploadedAt: new Date(),
          // });

          // 2. Trigger asynchronous processing (similar to what /api/process-file did)
          // This might involve queuing a job, calling another function, etc.
          // Pass necessary details like blob.url, blob.pathname, userId
          // Example: await triggerBackgroundProcessing({
          //   blobUrl: blob.url,
          //   blobPathname: blob.pathname,
          //   userId: userId,
          //   // Add any other relevant info
          // });

           console.log(`TODO: Implement processing trigger for user ${userId}, blob: ${blob.pathname}`);

          // Placeholder for where you'd trigger the background job or processing function
          // await processUploadedBlob(blob.url, blob.pathname, userId);

        } catch (error) {
          console.error('Error during onUploadCompleted:', error);
          // Even if DB update or processing fails, the blob is already uploaded.
          // Consider logging this failure for monitoring.
          // Don't throw here unless you want the client to see an error,
          // otherwise the webhook might retry unnecessarily.
        }
        // --- End of replacement section ---
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error in blob client upload handler:', error);
    // Return a generic error response
    return NextResponse.json(
      { error: (error as Error).message || 'Upload failed.' },
      { status: 400 }, // Use 400 for client errors (like auth failures)
    );
  }
} 