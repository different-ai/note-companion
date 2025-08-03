import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fsPromises } from "node:fs";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyKey } from "@unkey/api";

export const maxDuration = 300; // 5 minutes for larger files

export async function POST(request: Request) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    const key = authHeader?.replace("Bearer ", "");
    
    if (!key) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { result, error } = await verifyKey(key);
    if (error || !result.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let tempFilePath: string;
    let extension: string;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload from plugin
      const formData = await request.formData();
      const audioFile = formData.get("audio") as File;
      
      if (!audioFile) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
      }

      extension = audioFile.name.split(".").pop()?.toLowerCase() || "webm";
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      tempFilePath = join(tmpdir(), `upload_${Date.now()}.${extension}`);
      await fsPromises.writeFile(tempFilePath, buffer);
    } else {
      // Handle base64 upload from audio recorder
      const { audio, extension: ext } = await request.json();
      if (!audio || !ext) {
        return NextResponse.json({ error: "Missing audio or extension" }, { status: 400 });
      }

      extension = ext;
      const base64Data = audio.split(";base64,").pop();
      if (!base64Data) {
        return NextResponse.json({ error: "Invalid base64 data" }, { status: 400 });
      }

      tempFilePath = join(tmpdir(), `upload_${Date.now()}.${extension}`);
      await fsPromises.writeFile(tempFilePath, base64Data, { encoding: "base64" });
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE || "https://api.openai.com/v1"
    });

    // Check file size
    const stats = await fsPromises.stat(tempFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (fileSizeInMB <= 25) {
      // File is small enough to process directly
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
      });

      await fsPromises.unlink(tempFilePath);
      return NextResponse.json({ text: transcription.text });
    } else {
      // File is too large for OpenAI's API
      await fsPromises.unlink(tempFilePath);
      return NextResponse.json(
        { error: "Audio file is too large. Please use a file smaller than 25MB." },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}