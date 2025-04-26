import { NextRequest, NextResponse } from "next/server";
import { handleAuthorization } from "@/lib/handleAuthorization";
import { db, uploadedFiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { generateText } from "ai";
import { getModel } from "@/lib/models";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";

const ALLOWED_FILE_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await handleAuthorization(request);
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = ALLOWED_FILE_TYPES[file.type];
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`${userId}/${file.name}`, file, {
      access: "public",
    });

    // Create database record
    const [uploadedFile] = await db
      .insert(uploadedFiles)
      .values({
        userId,
        blobUrl: blob.url,
        fileType,
        originalName: file.name,
        status: "processing",
      })
      .returning();

    // Convert blob to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Process with appropriate model
    const modelName = process.env.MODEL_NAME || "gpt-4.1-mini";
    console.log(`OCR processing using model: ${modelName}`);
    const model = getModel(modelName);
    
    const aiResponse = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: "You are an OCR assistant. Extract all text from the provided document or image. If there are any diagrams or visual elements, describe them briefly.",
        },
        {
          role: "user",
          content: [
            {
              type: "image",
              image: base64,
            },
            {
              type: "text",
              text: "Please extract all text from this file.",
            },
          ],
        },
      ],
    });
    
    console.log(`OCR processing completed with ${aiResponse.usage.totalTokens} tokens`);

    // Update database with results
    await db
      .update(uploadedFiles)
      .set({
        status: "completed",
        textContent: aiResponse.text,
        tokensUsed: aiResponse.usage.totalTokens,
        updatedAt: new Date(),
      })
      .where(eq(uploadedFiles.id, uploadedFile.id));

    // Update user's token usage
    await incrementAndLogTokenUsage(userId, aiResponse.usage.totalTokens);

    return NextResponse.json({
      success: true,
      fileId: uploadedFile.id,
      text: aiResponse.text,
      tokensUsed: aiResponse.usage.totalTokens,
    });
  } catch (error) {
    console.error("Test OCR error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
} 