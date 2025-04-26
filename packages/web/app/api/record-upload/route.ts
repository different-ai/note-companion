import { NextRequest, NextResponse } from "next/server";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";
import { db, uploadedFiles } from "@/drizzle/schema";

export async function POST(request: NextRequest) {
  try {
    const authResult = await handleAuthorizationV2(request);
    const userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, publicUrl, originalName, fileType, processType } = (await request.json()) as {
      key: string;
      publicUrl: string;
      originalName: string;
      fileType: string;
      processType?: string;
    };

    if (!key || !publicUrl || !originalName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields (key, publicUrl, originalName, fileType)" },
        { status: 400 }
      );
    }

    // Insert record into the database
    const [newRecord] = await db
      .insert(uploadedFiles)
      .values({
        userId: userId,
        r2Key: key, // Store the R2 object key
        blobUrl: publicUrl, // Store the accessible URL
        originalName: originalName,
        fileType: fileType,
        status: "pending", // Initial status, waiting for background processing
        processType: processType || "standard-ocr", // Use the provided processType or default
        // size can be added if sent from the client
        // embeddings will be generated later
      })
      .returning();

    if (!newRecord) {
      throw new Error("Failed to insert upload record into database");
    }

    console.log("Recorded new upload:", newRecord.id, key, processType || "standard-ocr");

    return NextResponse.json({ success: true, fileId: newRecord.id }, { status: 201 });

  } catch (error: unknown) {
    if (error && typeof error === 'object') {
      if ('status' in error && error.status === 401) {
        const message = 'message' in error ? String(error.message) : 'Unauthorized';
        return NextResponse.json({ error: message }, { status: 401 });
      }
    }
    console.error("Error recording upload:", error);
    // Check for specific database errors if needed
    const errorMessage = error instanceof Error ? error.message : "Failed to record upload";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 