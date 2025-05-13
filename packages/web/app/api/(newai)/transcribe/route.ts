import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import { NextResponse } from "next/server";
import OpenAI from "openai";


export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData(); // ⬅️ parse the form data
    const file = formData.get('file') as File; // ⬅️ get the uploaded file

    // Add this check after getting the file from formData
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'File is missing or empty' }, { status: 400 });
    }

    console.log("✅: Received audio file");

    // Convert file to Blob and create FormData
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type });
    const newFormData = new FormData();
    newFormData.append("file", blob, file.name);

    // Upload audio to `transcribe/upload`
    const uploadResponse = await fetch(`http://localhost:3000/api/transcribe/upload`, {
      method: "POST",
      body: formData,
      timeout: 600000,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      console.error("Upload error:", error);
      return NextResponse.json({ error: "Failed to upload audio" }, { status: 500 });
    }

    const { url } = await uploadResponse.json();
    console.log("✅: Audio uploaded successfully, URL:", url);

    // Send the audio URL to the chunk-audio endpoint
    const chunkFormData = new FormData();
    chunkFormData.append("audioUrl", url);

    const chunkResponse = await fetch(`http://localhost:3000/api/transcribe/chunk-audio`, {
      method: "POST",
      body: chunkFormData,
    });

    if (!chunkResponse.ok) {
      const error = await chunkResponse.json();
      console.error("Chunking error:", error);
      throw new Error("Audio chunking failed");
    }

    const { chunkPaths } = await chunkResponse.json();

    if (!chunkPaths || !Array.isArray(chunkPaths) || chunkPaths.length === 0) {
      throw new Error("Audio chunking failed or returned no chunks");
    }

    console.log("✅: Audio chunking complete:", chunkPaths);

    // Transcribe chunks concurrently
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE || "https://api.openai.com/v1",
    });

    const transcriptions = await Promise.all(
      chunkPaths.map(async (chunkPath) => {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(chunkPath),
          model: "whisper-1",
        });
        return transcription.text;
      })
    );

    // Combine transcriptions
    const fullTranscription = transcriptions.join(" ");
    console.log("✅: Full transcription complete");

    // Clean up temporary files after processing
    try {
      await Promise.all(chunkPaths.map((chunkPath) => fsPromises.unlink(chunkPath)));
      console.log("✅: Temporary chunk files cleaned up");
    } catch (cleanupError) {
      console.error("Error cleaning up temporary files:", cleanupError);
    }

    return NextResponse.json({ text: fullTranscription });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}

