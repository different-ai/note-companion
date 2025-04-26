import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization"; // Assuming this handles auth
import { v4 as uuidv4 } from "uuid"; // For unique filenames

const R2_BUCKET = process.env.R2_BUCKET;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_REGION = process.env.R2_REGION || "auto"; // R2 uses 'auto'

if (
  !R2_BUCKET ||
  !R2_ENDPOINT ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY
) {
  console.error("Missing R2 environment variables!");
  // In a real app, you might prevent startup or throw a config error
}

const r2Client = new S3Client({
  endpoint: R2_ENDPOINT,
  region: R2_REGION,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  console.log("--- Create Upload URL Start ---"); // Add start marker
  console.log("Checking R2 Env Vars:", {
      R2_BUCKET: process.env.R2_BUCKET ? 'Loaded' : 'MISSING',
      R2_ENDPOINT: process.env.R2_ENDPOINT ? 'Loaded' : 'MISSING',
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? 'Loaded' : 'MISSING',
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? 'Loaded' : 'MISSING',
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ? process.env.R2_PUBLIC_URL : 'MISSING or Undefined'
  });

  try {
    const authResult = await handleAuthorizationV2(request);
    const userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType } = (await request.json()) as {
      filename: string;
      contentType: string;
    };

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or contentType" },
        { status: 400 }
      );
    }

    // Sanitize filename (optional, but recommended)
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    // Create a unique key prefixing with userId to ensure separation
    const key = `uploads/${userId}/${uuidv4()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream", // Use provided type or default
      // Add ACL if your bucket requires it, e.g., ACL: 'public-read' if needed
    });

    // Generate the presigned URL (expires in 1 hour)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // Construct the public URL (adjust based on your R2 public access setup)
    // This assumes a custom domain or standard R2 public URL pattern.
    // If your bucket isn't public, you might need another mechanism (e.g., signed GET URLs)
    console.log("R2_PUBLIC_URL from env:", process.env.R2_PUBLIC_URL);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`; // Example public URL

    return NextResponse.json({ uploadUrl, key, publicUrl });

  } catch (error: unknown) {
     if (error && typeof error === 'object') {
       // Handle specific auth errors from handleAuthorizationV2 if they have a status
       if ('status' in error && error.status === 401) {
          // Check if message exists before accessing
          const message = 'message' in error ? String(error.message) : 'Unauthorized';
          return NextResponse.json(
            { error: message },
            { status: 401 }
          );
       }
     }
    console.error("Error creating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
} 