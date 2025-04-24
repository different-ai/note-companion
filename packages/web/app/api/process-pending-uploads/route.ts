import { NextRequest, NextResponse } from "next/server";
import { db, uploadedFiles, UploadedFile } from "@/drizzle/schema";
import { eq, or } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { createOpenAI } from "@ai-sdk/openai";
import OpenAI, { toFile } from "openai";
import { generateObject } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";

// --- OpenAI Client for Image Generation ---
const openaiImageClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- R2/S3 Configuration ---
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_REGION = process.env.R2_REGION || "auto";

if (!R2_BUCKET || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("Missing R2 environment variables for background worker!");
}

const r2Client = new S3Client({
  endpoint: R2_ENDPOINT,
  region: R2_REGION,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});


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
    // Convert stream to buffer
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (error) {
    console.error(`Error downloading ${key} from R2:`, error);
    throw new Error(`Failed to download file from R2: ${key}`);
  }
}

// Helper function to process image with gpt-4o
async function processImageWithGPT4o(
  imageUrl: string
): Promise<{ textContent: string; tokensUsed: number }> {
  try {
    console.log("Processing image with gpt-4.1 for OCR...");
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log(`Processing OCR for image: ${imageUrl}`);
    const { object, usage } = await generateObject({
      model: openai("gpt-4.1"),
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
      `gpt-4.1 OCR extracted ${textContent.length} chars, used approx ${tokensUsed} tokens`
    );
    return { textContent, tokensUsed };
  } catch (error) {
    console.error("Error processing image with gpt-4.1 OCR:", error);
    return {
      textContent: `Error processing image OCR: ${
        error instanceof Error ? error.message : String(error)
      }`,
      tokensUsed: 0,
    };
  }
}

// Function to process magic diagrams - Bringing back toFile with mimetype
async function processMagicDiagram(
  r2Key: string, // Use r2Key to fetch the actual image
  originalFileName: string
  // Remove userId parameter
): Promise<{ generatedImageUrl: string; tokensUsed: number; error?: string }> {
  let tempImagePath: string | null = null; // Track temporary file path
  try {
    console.log(
      `Processing Magic Diagram (Image Gen) for: ${originalFileName}`
    );

    // 1. Download original image from R2 using the key
    console.log(`Downloading original image from R2 key: ${r2Key}`);
    const originalImageBuffer = await downloadFromR2(r2Key);
    console.log(`Downloaded ${originalImageBuffer.length} bytes for ${originalFileName}`);

    // 2. Create a temporary file path for the original image
    const tempDir = os.tmpdir();
    const safeFileName = path.basename(originalFileName);
    // Keep original extension if present, default to .png otherwise
    const extension = path.extname(safeFileName) || '.png';
    const tempOriginalFileName = `${Date.now()}-${path.basename(safeFileName, extension)}${extension}`;
    tempImagePath = path.join(tempDir, tempOriginalFileName);
    console.log(`Writing original image buffer to temporary path: ${tempImagePath}`);

    // 3. Write the original buffer to the temporary file
    fs.writeFileSync(tempImagePath, originalImageBuffer as unknown as Uint8Array);
    console.log(`Successfully wrote original buffer to ${tempImagePath}`);

    // 4. Prepare the generation prompt
    const generationPrompt = `Digitize this sketch image into a clean, well-rendered diagram suitable for digital files. Preserve the core elements and connections shown in the sketch. Original filename for context: ${originalFileName}.`;
    console.log(`Generating image with prompt: ${generationPrompt.substring(0, 150)}...`);

    // 5. Create read stream and determine mimetype
    console.log(`Creating read stream for temporary original image: ${tempImagePath}`);
    const imageStream = fs.createReadStream(tempImagePath);

    // Determine mimetype based on temp file extension
    let mimeType = 'image/png'; // Default
    const fileExt = path.extname(tempImagePath).toLowerCase();
    if (fileExt === '.jpg' || fileExt === '.jpeg') {
        mimeType = 'image/jpeg';
    } else if (fileExt === '.webp') {
        mimeType = 'image/webp';
    }
    console.log(`Determined mimetype: ${mimeType}`);

    // 6. Prepare image file for OpenAI API using toFile with correct mimetype
    const preparedImage = await toFile(imageStream, path.basename(tempImagePath), {
        type: mimeType, // Pass the determined mimetype
    });
    console.log(`Prepared image for OpenAI API: ${preparedImage.name} with type ${mimeType}`);

    // 7. Call the OpenAI API with the prepared image file
    const response = await openaiImageClient.images.edit({
      model: "gpt-image-1",
      image: preparedImage, // Pass the prepared file object from toFile
      prompt: generationPrompt,
      n: 1,
      size: "1024x1024",
      // response_format: "url", // Keep default (url)
    });

    const generatedImageUrl = response.data[0]?.url;
    console.log(`Received generated image URL: ${generatedImageUrl}`);

    if (!generatedImageUrl) {
      console.error("Image generation response data (check for errors):", response.data);
      throw new Error(
        "Image generation failed, no URL returned in the response."
      );
    }

    // 8. Estimate token usage (placeholder)
    // TODO: Estimate token usage accurately based on OpenAI response if available
    const tokensUsed = 5000; // Placeholder

    // 9. Return the received URL directly
    return { generatedImageUrl: generatedImageUrl, tokensUsed };

  } catch (error: unknown) {
    console.error("Error in processMagicDiagram (image generation):", error);
    let errorMessage = "Unknown error generating diagram image";

    // Keep the improved error handling structure
    interface OpenAIErrorDetail {
      message?: string;
    }
    interface OpenAIErrorWrapper {
      error?: OpenAIErrorDetail;
      message?: string;
    }

    if (error && typeof error === 'object' && 'message' in error && !(error instanceof Error)) {
      errorMessage = String(error.message);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      const potentialError = error as OpenAIErrorWrapper;
      const nestedError = potentialError?.error;
      if (nestedError?.message) {
        errorMessage = String(nestedError.message);
      } else if (potentialError?.message) {
        errorMessage = String(potentialError.message);
      }
    }

    console.error("Full error object:", error); // Log the full error object for debugging
    return {
      generatedImageUrl: "",
      tokensUsed: 0,
      error: `Error generating diagram: ${errorMessage}`,
    };
  } finally {
    // 10. Clean up the temporary original image file
    if (tempImagePath) {
      console.log(`Cleaning up temporary original image file: ${tempImagePath}`);
      try {
        fs.unlinkSync(tempImagePath);
        console.log(`Successfully deleted ${tempImagePath}`);
      } catch (cleanupError) {
        console.error(`Failed to delete temporary file ${tempImagePath}:`, cleanupError);
      }
    }
  }
}

// --- Reusable Processing Function ---
async function processSingleFileRecord(fileRecord: UploadedFile): Promise<{
  status: "completed" | "error";
  textContent: string | null;
  generatedImageUrl: string | null;
  tokensUsed: number;
  error: string | null;
}> {
  const fileId = fileRecord.id;
  // Remove userId fetch if only needed for R2 key generation
  // const userId = fileRecord.userId;
  let textContent: string | null = null;
  let generatedImageUrl: string | null = null;
  let tokensUsed = 0;
  let processingError: string | null = null;

  // Define r2Key determination logic once at the beginning
  let r2Key = fileRecord.r2Key;
  if (!r2Key) {
    const urlParts = fileRecord.blobUrl.split("/");
    const uploadSegmentIndex = urlParts.findIndex((part) => part === "uploads");
    if (uploadSegmentIndex !== -1 && uploadSegmentIndex < urlParts.length - 1) {
      r2Key = urlParts.slice(uploadSegmentIndex).join("/");
      console.log(`[File ${fileId}] Derived R2 key from blobUrl: ${r2Key}`);
    } else {
      console.error(`[File ${fileId}] Could not determine R2 key from blobUrl: ${fileRecord.blobUrl}`);
      // Set error and return immediately if r2Key is essential and cannot be derived
      return {
        status: "error",
        textContent: null,
        generatedImageUrl: null,
        tokensUsed: 0,
        error: `Could not determine R2 key from blobUrl: ${fileRecord.blobUrl}`,
      };
    }
  }
  if (!r2Key) {
     // This check might be redundant if the above block handles the error case,
     // but serves as a safeguard.
     console.error(`[File ${fileId}] Missing R2 key after derivation attempt.`);
     return {
        status: "error",
        textContent: null,
        generatedImageUrl: null,
        tokensUsed: 0,
        error: `Missing R2 key for file ID ${fileId}`,
     };
  }
   // Log the final R2 key being used
  console.log(`[File ${fileId}] Using R2 key: ${r2Key}`);


  try {
    console.log(`Starting single file processing for ID: ${fileId}`);
    const processType = fileRecord.processType || "standard-ocr";
    const fileType = fileRecord.fileType.toLowerCase();
    console.log(`Processing type: ${processType}, File type: ${fileType}`);


    // Download is now only needed for magic-diagram before calling its function.
    // processImageWithGPT4o uses the blobUrl directly.

    // --- Processing Logic ---
    console.log(`Processing file ${fileId} with processType: ${processType}`);
    if (processType === "magic-diagram" && fileType.startsWith("image/")) {
      // --- Magic Diagram Processing (Image Generation) ---
      console.log(`Processing Magic Diagram for ${fileId}`);
      // Call without userId
      const result = await processMagicDiagram(r2Key, fileRecord.originalName);
      if (result.error) {
        processingError = result.error;
        tokensUsed = 0;
        generatedImageUrl = null;
        textContent = `[Error generating diagram: ${result.error}]`;
      } else {
        generatedImageUrl = result.generatedImageUrl;
        tokensUsed = result.tokensUsed;
        textContent = `[Generated Diagram Image](${generatedImageUrl})`;
      }
    } else if (
      processType === "standard-ocr" &&
      fileType.startsWith("image/")
    ) {
      // --- Standard OCR Processing ---
      // Standard OCR uses the public blobUrl
      if (!fileRecord.blobUrl) {
           throw new Error(`Missing blobUrl for OCR processing of file ID ${fileId}`);
       }
      console.log(`Processing Standard OCR for ${fileId} using blobUrl: ${fileRecord.blobUrl}`);
      const result = await processImageWithGPT4o(fileRecord.blobUrl);
      textContent = result.textContent;
      tokensUsed = result.tokensUsed;
      if (textContent?.startsWith("Error processing image OCR")) {
        processingError = textContent;
        textContent = null;
      } else if (
        !processingError &&
        (!textContent || textContent.trim() === "")
      ) {
        console.warn(`No text content extracted for file ${fileId}`);
        textContent = "[OCR completed, but no text extracted]";
      }
      generatedImageUrl = null; // Ensure generated URL is null for OCR
    } else if (fileType === "application/pdf" || fileType.includes("pdf")) {
      processingError = "PDF processing not yet implemented.";
      textContent = "[PDF Content - Processing Pending Implementation]";
      tokensUsed = 0;
      generatedImageUrl = null;
    } else {
        // Handle text files explicitly if needed
         if (fileType === 'text/plain' || fileType === 'text/markdown') {
             console.log(`Handling plain text/markdown file ${fileId}. Downloading content...`);
              // Download content for text files
             const buffer = await downloadFromR2(r2Key);
             textContent = buffer.toString('utf-8');
             tokensUsed = 0; // No LLM processing cost for plain text
             console.log(`Extracted ${textContent.length} chars from text file ${fileId}`);
             generatedImageUrl = null;
         } else {
            processingError = `Unsupported file type/processType: ${fileType} / ${processType}`;
            textContent = `[Unsupported: ${fileType}]`;
            tokensUsed = 0;
            generatedImageUrl = null;
         }
    }
    // --- End Processing Logic ---
  } catch (error: unknown) {
    console.error(`Error during single file processing ${fileId}:`, error);
    processingError =
      error instanceof Error ? error.message : "Unknown processing error";
    textContent = null; // Ensure null on error
    generatedImageUrl = null; // Ensure null on error
    tokensUsed = 0;
  }

  const finalStatus = processingError ? "error" : "completed";
  console.log(
    `Single file processing result for ${fileId}: Status=${finalStatus}, Error=${processingError}, Tokens=${tokensUsed}`
  );
  return {
    status: finalStatus,
    textContent: processingError ? `[Processing Error: ${processingError}]` : textContent,
    generatedImageUrl: generatedImageUrl,
    tokensUsed: tokensUsed,
    error: processingError,
  };
}

// --- Main Worker Logic --- //

export async function GET(request: NextRequest) {
  // 1. Authorization Check (Using a simple secret header for cron jobs)
  console.log("[/api/process-pending-uploads] Worker starting..."); // Log worker start
  const cronSecret = request.headers.get("authorization")?.split(" ")[1];
  if (cronSecret !== process.env.CRON_SECRET) {
    console.warn(
      "[/api/process-pending-uploads] Unauthorized cron job attempt"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[/api/process-pending-uploads] Authorized.");

  console.log(
    "[/api/process-pending-uploads] Starting background processing job..."
  );
  let processedCount = 0;
  let errorCount = 0;

  try {
    // 2. Fetch pending files (limit batch size)
    console.log(
      "[/api/process-pending-uploads] Fetching pending files from DB..."
    );
    const pendingFiles = await db
      .select()
      .from(uploadedFiles)
      // Fetch 'pending' or 'processing' (in case a previous run timed out after marking as processing)
      .where(
        or(
          eq(uploadedFiles.status, "pending"),
          eq(uploadedFiles.status, "processing")
        )
      )
      .limit(10); // Process up to 10 files per run

    // --- LOG THE FETCHED FILES ---
    console.log(
      `[/api/process-pending-uploads] Found ${pendingFiles.length} files to process.`
    );
    if (pendingFiles.length > 0) {
      console.log(
        "[/api/process-pending-uploads] Pending file IDs and types:",
        pendingFiles.map((f) => ({
          id: f.id,
          status: f.status,
          processType: f.processType,
        }))
      );
    }
    // --- END LOGGING ---

    if (pendingFiles.length === 0) {
      console.log(
        "[/api/process-pending-uploads] No pending files to process."
      );
      return NextResponse.json({ message: "No pending files" });
    }

    console.log(
      `Found ${pendingFiles.length} pending/processing files to attempt.`
    );

    // 3. Process each file
    for (const fileRecord of pendingFiles) {
      const fileId = fileRecord.id;
      const userId = fileRecord.userId;

      try {
        // Optimistically update status to processing *before* heavy lifting
        // This helps identify files that might timeout during processing
        if (fileRecord.status !== "processing") {
          await db
            .update(uploadedFiles)
            .set({ status: "processing", updatedAt: new Date(), error: null }) // Clear previous error on retry
            .where(eq(uploadedFiles.id, fileId));
          console.log(`Marked file ${fileId} as processing.`);
        } else {
          console.log(
            `File ${fileId} was already marked as processing, retrying...`
          );
        }

        // Call the reusable processing function
        const result = await processSingleFileRecord(fileRecord);

        // 4. Update Database Record with the final result (including generatedImageUrl)
        await db
          .update(uploadedFiles)
          .set({
            status: result.status,
            textContent: result.textContent, // Store extracted text (might be null)
            generatedImageUrl: result.generatedImageUrl, // Store generated image URL (might be null)
            tokensUsed: result.tokensUsed,
            error: result.error, // Store error message if processing failed
            updatedAt: new Date(),
          })
          .where(eq(uploadedFiles.id, fileId));

        console.log(
          `Finished processing file ${fileId} with final status: ${result.status}`
        );

        // 5. Increment Token Usage (only on successful completion)
        if (result.status === "completed" && result.tokensUsed > 0) {
          processedCount++;
          try {
            await incrementAndLogTokenUsage(userId, result.tokensUsed);
            console.log(
              `Incremented token usage for user ${userId} by ${result.tokensUsed}`
            );
          } catch (tokenError) {
            console.error(
              `Failed to increment token usage for user ${userId} after processing file ${fileId}:`,
              tokenError
            );
          }
        } else if (result.status === "error") {
          errorCount++;
        } else {
          // Successfully processed but used 0 tokens (e.g., empty extraction)
          processedCount++;
        }
      } catch (dbUpdateError: unknown) {
        // Catch errors specifically from DB updates or other unexpected issues within the loop
        console.error(
          `Critical error during processing loop for file ${fileId}:`,
          dbUpdateError
        );
        errorCount++;
        // Attempt to mark the file as error in DB if something unexpected happened
        try {
          await db
            .update(uploadedFiles)
            .set({
              status: "error",
              error: `Processing Loop Error: ${
                dbUpdateError instanceof Error
                  ? dbUpdateError.message
                  : String(dbUpdateError)
              }`,
              updatedAt: new Date(),
            })
            .where(eq(uploadedFiles.id, fileId));
        } catch (finalDbError) {
          console.error(
            `Failed even to mark file ${fileId} as error after critical loop failure:`,
            finalDbError
          );
        }
      }
    } // End loop through pending files

    return NextResponse.json({
      message: `Processing complete. Attempted: ${pendingFiles.length}, Succeeded: ${processedCount}, Errors: ${errorCount}`,
    });
  } catch (error: unknown) {
    console.error("Error in background processing job:", error);
    return NextResponse.json(
      {
        error: "Background processing job failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
