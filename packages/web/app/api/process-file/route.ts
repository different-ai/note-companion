import { NextRequest, NextResponse } from "next/server";
import { db, uploadedFiles, UploadedFile } from "@/drizzle/schema";
import { eq, or, and } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import sharp from "sharp";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";
export const maxDuration = 800; // This function can run for a maximum of 5 seconds

// --- R2/S3 Configuration (Copied from process-pending-uploads) ---
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_REGION = process.env.R2_REGION || "auto";

if (!R2_BUCKET || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("Missing R2 environment variables!");
}

const r2Client = new S3Client({
  endpoint: R2_ENDPOINT,
  region: R2_REGION,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

// --- Helper Functions (Copied/Adapted from process-pending-uploads) ---

// Helper to download from R2 and return a Buffer
async function downloadFromR2(key: string): Promise<Buffer> {
  console.log(`Downloading from R2: ${key}`);
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  try {
    const response = await r2Client.send(command);
    if (!response.Body) {
      throw new Error("No body received from R2 getObject");
    }
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (error) {
    console.error(`Error downloading ${key} from R2:`, error);
    throw new Error(`Failed to download file from R2: ${key}`);
  }
}

// Helper function to process image with gpt-4o
async function processImageWithGPT4one(
  imageUrl: string
): Promise<{ textContent: string; tokensUsed: number }> {
  // Keep the existing implementation from process-file/route.ts (or the improved one from process-pending-uploads if different)
  try {
    console.log("Processing image with gpt-4o..."); // Use gpt-4o consistently
    const { getModel } = await import("@/lib/models");
    const model = getModel("gpt-4o");
    
    console.log(`Processing image URL: ${imageUrl}`); // Log the URL being sent
    const { object, usage } = await generateObject({
      //   model: openai("gpt-4.1"), // Ensure this uses gpt-4o if intended
      model,
      schema: z.object({ markdown: z.string() }),
      messages: [
        {
          role: "system",
          content: "Extract all text comprehensively, preserving formatting.",
        },
        { role: "user", content: [{ type: "image", image: imageUrl }] },
      ],
    });
    const textContent = object.markdown || "";
    const tokensUsed = usage?.totalTokens ?? Math.ceil(textContent.length / 4);
    console.log(
      `gpt-4o extracted ${textContent.length} chars, used approx ${tokensUsed} tokens`
    );
    return { textContent, tokensUsed };
  } catch (error) {
    console.error("Error processing image with gpt-4o:", error);
    // Check if it's an API error with details
    if (error && typeof error === "object" && "message" in error) {
      // Potentially extract more specific error details if available from the SDK error object
      return {
        textContent: `Error processing image with gpt-4o: ${error.message}`,
        tokensUsed: 0,
      };
    }
    return {
      textContent: `Error processing image with gpt-4o: ${String(error)}`,
      tokensUsed: 0,
    };
  }
}

// --- Reusable Processing Function (Copied from process-pending-uploads) ---
async function processSingleFileRecord(fileRecord: UploadedFile): Promise<{
  status: "completed" | "error";
  textContent: string | null;
  tokensUsed: number;
  error: string | null;
}> {
  const fileId = fileRecord.id;
  let textContent = "";
  let tokensUsed = 0;
  let processingError: string | null = null;

  try {
    console.log(`Starting single file processing for ID: ${fileId}`);

    // Determine R2 key
    let r2Key = fileRecord.r2Key;
    if (!r2Key) {
      const urlParts = fileRecord.blobUrl.split("/");
      const uploadSegmentIndex = urlParts.findIndex(
        (part) => part === "uploads"
      );
      if (
        uploadSegmentIndex !== -1 &&
        uploadSegmentIndex < urlParts.length - 1
      ) {
        r2Key = urlParts.slice(uploadSegmentIndex).join("/");
        console.log(`Derived R2 key from blobUrl: ${r2Key}`);
      } else {
        throw new Error(
          `Could not determine R2 key from blobUrl: ${fileRecord.blobUrl}`
        );
      }
    }
    if (!r2Key) {
      throw new Error(`Missing R2 key for file ID ${fileId}`);
    }

    // Download file from R2
    // Note: Downloading happens here, not needed before calling this function if called directly
    // const buffer = await downloadFromR2(r2Key); // This line is removed if buffer is not needed directly here

    const fileType = fileRecord.fileType.toLowerCase();

    // --- Processing Logic ---
    if (fileType === "application/pdf" || fileType.includes("pdf")) {
      console.warn(`PDF processing (${fileId}) needs full implementation`);
      processingError = "PDF processing not yet fully implemented.";
      textContent = "[PDF Content - Processing Pending Implementation]";
      tokensUsed = 0;
    } else if (fileType.startsWith("image/")) {
      // We pass the public blobUrl directly to GPT-4o
      console.log(
        `Processing Image (${fileId}) using GPT-4o with URL: ${fileRecord.blobUrl}`
      );
      if (!fileRecord.blobUrl) {
        throw new Error(`Missing blobUrl for image file ID ${fileId}`);
      }
      const result = await processImageWithGPT4one(fileRecord.blobUrl);
      textContent = result.textContent;
      tokensUsed = result.tokensUsed;
      if (textContent.startsWith("Error processing image")) {
        processingError = textContent;
      }
    } else {
      // Handle text files explicitly if needed, otherwise mark as unsupported
      if (fileType === "text/plain" || fileType === "text/markdown") {
        // For text files, we need the content. Download if not already present?
        // Assuming text content might be handled differently or stored directly
        // For now, let's assume direct text uploads are handled elsewhere or text needs download
        console.warn(
          `Text file processing (${fileId}) needs content - assuming download required`
        );
        const buffer = await downloadFromR2(r2Key);
        textContent = buffer.toString("utf-8");
        tokensUsed = 0; // No LLM processing cost for plain text
        console.log(
          `Extracted ${textContent.length} chars from text file ${fileId}`
        );
      } else {
        console.warn(`Unsupported file type for processing: ${fileType}`);
        processingError = `Unsupported file type: ${fileType}`;
      }
    }
    // --- End Processing Logic ---

    if (!processingError && (!textContent || textContent.trim() === "")) {
      console.warn(
        `No text content extracted or file was empty for file ${fileId}`
      );
      textContent =
        "[Processing completed, but no text extracted or file was empty]";
    }
  } catch (error: unknown) {
    console.error(`Error during single file processing ${fileId}:`, error);
    processingError =
      error instanceof Error ? error.message : "Unknown processing error";
    textContent = null;
    tokensUsed = 0;
  }

  const finalStatus = processingError ? "error" : "completed";
  console.log(
    `Single file processing result for ${fileId}: Status=${finalStatus}, Error=${processingError}`
  );
  return {
    status: finalStatus,
    textContent: processingError ? null : textContent,
    tokensUsed: processingError ? 0 : tokensUsed,
    error: processingError,
  };
}

// --- Main POST Handler ---
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let fileId: number | null = null;

  try {
    // 1. Authorization
    console.log("API: Received request to /api/process-file");
    const authResult = await handleAuthorizationV2(request);
    userId = authResult.userId; // Assign userId here
    if (!userId) {
      // handleAuthorizationV2 should throw or return specific structure on failure
      // but double-check ensures userId is available.
      console.error("Authorization failed - no userId returned");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`Authorized user ${userId} for /api/process-file`);

    // 2. Get fileId from request body
    const payload = (await request.json()) as { fileId: number | string };
    if (!payload.fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Convert fileId to number
    try {
      fileId = Number(payload.fileId);
      if (isNaN(fileId)) {
        throw new Error("Invalid numeric file ID");
      }
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid file ID format" },
        { status: 400 }
      );
    }
    console.log(`Request to process file ID: ${fileId}`);

    // 3. Fetch File Record & Check Permissions
    const [fileRecord] = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, fileId))
      .limit(1);

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (fileRecord.userId !== userId) {
      console.error(
        `User mismatch: Request from ${userId}, file ${fileId} belongs to ${fileRecord.userId}`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Avoid reprocessing completed/failed files unless explicitly intended
    if (fileRecord.status === "completed" || fileRecord.status === "error") {
      console.log(
        `File ${fileId} is already in status '${fileRecord.status}'. Skipping reprocessing.`
      );
      return NextResponse.json({
        success: true, // Indicate the call was received okay
        message: `File already processed with status: ${fileRecord.status}`,
        status: fileRecord.status,
        text: fileRecord.textContent, // Return existing text if completed
        error: fileRecord.error,
      });
    }

    // 4. Mark as Processing
    console.log(`Marking file ${fileId} as processing...`);
    await db
      .update(uploadedFiles)
      .set({ status: "processing", updatedAt: new Date(), error: null }) // Clear previous error
      .where(eq(uploadedFiles.id, fileId));

    // 5. Call Reusable Processing Function
    const result = await processSingleFileRecord(fileRecord);

    // 6. Update Database Record with Final Result
    console.log(
      `Updating database for file ${fileId} with final status: ${result.status}`
    );
    await db
      .update(uploadedFiles)
      .set({
        status: result.status,
        textContent: result.textContent,
        tokensUsed: result.tokensUsed,
        error: result.error,
        updatedAt: new Date(),
      })
      .where(eq(uploadedFiles.id, fileId));

    // 7. Increment Token Usage (if successful)
    if (result.status === "completed" && result.tokensUsed > 0) {
      try {
        await incrementAndLogTokenUsage(userId, result.tokensUsed);
        console.log(
          `Incremented token usage for user ${userId} by ${result.tokensUsed} for file ${fileId}`
        );
      } catch (tokenError) {
        console.error(
          `Failed to increment token usage for user ${userId} after processing file ${fileId}:`,
          tokenError
        );
        // Log but don't fail the overall request
      }
    }

    // 8. Return Response
    console.log(
      `Processing finished for file ${fileId}. Status: ${result.status}`
    );
    if (result.status === "completed") {
      return NextResponse.json({
        success: true,
        message: "File processed successfully.",
        status: result.status,
        text: result.textContent, // Return extracted text on success
      });
    } else {
      // Return error status but 200 OK for the API call itself
      return NextResponse.json({
        success: false, // Indicate processing failed
        message: "File processing failed.",
        status: result.status,
        error: result.error,
      });
    }
  } catch (error: unknown) {
    console.error(
      `Unhandled error in /api/process-file for file ID ${fileId}:`,
      error
    );

    // Attempt to mark the file as error if possible
    if (fileId && userId) {
      // Check if we have enough info
      try {
        await db
          .update(uploadedFiles)
          .set({
            status: "error",
            error: `Unhandled API Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
            updatedAt: new Date(),
          })
          .where(
            and(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId))
          ); // Ensure user match
      } catch (dbUpdateError) {
        console.error(
          `Failed to mark file ${fileId} as error after unhandled exception:`,
          dbUpdateError
        );
      }
    }

    // Return a generic server error response
    return NextResponse.json(
      { error: "Failed to process file due to an internal server error." },
      { status: 500 }
    );
  }
}
