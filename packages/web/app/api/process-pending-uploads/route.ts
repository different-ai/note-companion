import { NextRequest, NextResponse } from "next/server";
import { db, uploadedFiles, UploadedFile } from "@/drizzle/schema";
import { eq, or } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { createOpenAI } from "@ai-sdk/openai";
import { OpenAI } from "openai";
import { generateObject } from "ai";
import { z } from "zod";

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

interface OCRImage {
  url?: string;
  data?: string;
  type?: string;
}

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
      textContent: `Error processing image OCR: ${error instanceof Error ? error.message : String(error)}`,
      tokensUsed: 0,
    };
  }
}

// Function to process magic diagrams - NOW USES IMAGE GENERATION
async function processMagicDiagram(
  imageUrl: string, // Original sketch URL for context
  originalFileName: string
): Promise<{ generatedImageUrl: string; tokensUsed: number; error?: string }> {
  try {
    console.log(`Processing Magic Diagram (Image Gen) for: ${originalFileName}`);

    const generationPrompt = `Digitize this sketch image into a clean, well-rendered diagram suitable for digital files. Preserve the core elements and connections shown in the sketch. Original sketch URL for context: ${imageUrl}. Original filename: ${originalFileName}.`;

    console.log(`Generating image with prompt: ${generationPrompt.substring(0, 150)}...`);

    const response = await openaiImageClient.images.generate({
      model: "dall-e-3",
      prompt: generationPrompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
      quality: "standard",
    });

    const generatedImageUrl = response.data[0]?.url;
    console.log(`Generated image URL: ${generatedImageUrl}`);

    if (!generatedImageUrl) {
      console.error("Image generation response data:", response.data);
      throw new Error("Image generation failed, no URL returned in the response.");
    }

    console.log(`Magic diagram generated image URL: ${generatedImageUrl}`);

    // Estimate token usage based on DALL-E 3 pricing (per image)
    // This is a placeholder; actual billing is per image.
    // We track it as 'tokens' for consistency in the usage table.
    const tokensUsed = 5000; // Placeholder for DALL-E 3 1024x1024 standard

    return { generatedImageUrl, tokensUsed };
  } catch (error: unknown) {
    console.error("Error in processMagicDiagram (image generation):", error);
    // Check if it's an OpenAI API error for more details
    let errorMessage = "Unknown error generating diagram image";
    if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
    }
    // Log the full error if possible
    console.error("Full error object:", error);
    return {
      generatedImageUrl: "",
      tokensUsed: 0,
      error: `Error generating diagram: ${errorMessage}`,
    };
  }
}

// --- Reusable Processing Function ---
async function processSingleFileRecord(
  fileRecord: UploadedFile
): Promise<{
  status: "completed" | "error";
  textContent: string | null; // Keep for standard OCR
  generatedImageUrl: string | null; // Keep for magic diagram
  tokensUsed: number;
  error: string | null;
}> {
  const fileId = fileRecord.id;
  let textContent: string | null = null;
  let generatedImageUrl: string | null = null;
  let tokensUsed = 0;
  let processingError: string | null = null;

  try {
    console.log(`Starting single file processing for ID: ${fileId}`);
    const processType = fileRecord.processType || "standard-ocr";
    const fileType = fileRecord.fileType.toLowerCase();
    console.log(`Processing type: ${processType}, File type: ${fileType}`);

    // --- DETAILED LOGGING --- 
    console.log(`[File ${fileId}] Checking conditions: processType='${processType}', fileType='${fileType}', fileType.startsWith('image/')=${fileType.startsWith('image/')}`);
    // --- END LOGGING --- 

    // Determine R2 key
    let r2Key = fileRecord.r2Key;
    if (!r2Key) {
      // Basic parsing - assumes URL structure like .../uploads/userId/uuid-filename
      const urlParts = fileRecord.blobUrl.split("/");
      // Find the 'uploads' segment and take everything after it
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
    const buffer = await downloadFromR2(r2Key);

    // --- Processing Logic ---
    console.log(`Processing file ${fileId} with processType: ${processType}`);
    if (processType === "magic-diagram" && fileType.startsWith("image/")) {
        // --- Magic Diagram Processing (Image Generation) ---
        console.log(`Processing Magic Diagram for ${fileId}`);
        const result = await processMagicDiagram(fileRecord.blobUrl, fileRecord.originalName);
        if (result.error) {
            processingError = result.error;
            tokensUsed = 0;
            generatedImageUrl = null;
            textContent = null; // Ensure text is null on error too
        } else {
            generatedImageUrl = result.generatedImageUrl;
            tokensUsed = result.tokensUsed;
            // Provide placeholder text or description indicating generation
            textContent = `[Generated Diagram: ${generatedImageUrl}]`;
        }
        // --- End Magic Diagram ---

    } else if (processType === "standard-ocr" && fileType.startsWith("image/")) {
        // --- Standard OCR Processing ---
        const result = await processImageWithGPT4o(fileRecord.blobUrl);
        textContent = result.textContent;
        tokensUsed = result.tokensUsed;
        if (textContent.startsWith("Error processing image OCR")) { // Check specific error message
          processingError = textContent;
          textContent = null;
        } else if (!processingError && (!textContent || textContent.trim() === "")) {
          console.warn(`No text content extracted for file ${fileId}`);
          textContent = "[OCR completed, but no text extracted]";
        }
        generatedImageUrl = null; // Ensure generated URL is null for OCR
        // --- End Standard OCR ---

    } else if (fileType === "application/pdf" || fileType.includes("pdf")) {
        processingError = "PDF processing not yet implemented.";
        textContent = "[PDF Content - Processing Pending Implementation]";
        tokensUsed = 0;
        generatedImageUrl = null;

    } else {
        processingError = `Unsupported file type/processType: ${fileType} / ${processType}`;
        textContent = `[Unsupported: ${fileType}]`;
        tokensUsed = 0;
        generatedImageUrl = null;
    }
    // --- End Processing Logic ---

  } catch (error: unknown) {
    console.error(`Error during single file processing ${fileId}:`, error);
    processingError = error instanceof Error ? error.message : "Unknown processing error";
    textContent = null;
    generatedImageUrl = null;
    tokensUsed = 0;
  }

  const finalStatus = processingError ? "error" : "completed";
  console.log(
    `Single file processing result for ${fileId}: Status=${finalStatus}, Error=${processingError}`
  );
  return {
    status: finalStatus,
    textContent: textContent,
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
    console.warn("[/api/process-pending-uploads] Unauthorized cron job attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[/api/process-pending-uploads] Authorized.");

  console.log("[/api/process-pending-uploads] Starting background processing job...");
  let processedCount = 0;
  let errorCount = 0;

  try {
    // 2. Fetch pending files (limit batch size)
    console.log("[/api/process-pending-uploads] Fetching pending files from DB...");
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
    console.log(`[/api/process-pending-uploads] Found ${pendingFiles.length} files to process.`);
    if (pendingFiles.length > 0) {
      console.log("[/api/process-pending-uploads] Pending file IDs and types:", 
        pendingFiles.map(f => ({ id: f.id, status: f.status, processType: f.processType }))
      );
    }
    // --- END LOGGING --- 

    if (pendingFiles.length === 0) {
      console.log("[/api/process-pending-uploads] No pending files to process.");
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

