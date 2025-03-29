import { NextResponse } from "next/server";
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlink, writeFile, readFile } from 'fs/promises';

// Constants for timing and chunks
const CHUNK_SIZE = 20 * 60; // 20 minutes in seconds (buffer for processing overhead)

// Serverless Function "api/transcribe". Serverless Functions must have a maxDuration between 1 and 800 for plan pro. : https://vercel.com/docs/concepts/limits/overview#serverless-function-execution-timeout
export const maxDuration = 800; // 120 minutes for long transcriptions

// Schema for request validation
const requestSchema = z.object({
  blobUrl: z.string().url(),
  extension: z.string().refine(ext => ['mp3', 'mp4', 'mpeg', 'mpga', 'wav', 'webm'].includes(ext)),
});

// Helper function to split audio into chunks
async function splitAudioIntoChunks(audioFilePath: string, extension: string) {
  try {
    // Get audio duration using ffprobe
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(audioFilePath, (err, metadata) => {
        if (err) reject(err);
        resolve(metadata.format.duration || 0);
      });
    });

    // If audio is shorter than chunk size, return it as is
    if (duration <= CHUNK_SIZE) {
      return [audioFilePath];
    }

    // Split into chunks
    const numChunks = Math.ceil(duration / CHUNK_SIZE);
    const chunkFiles: string[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunkFile = join(tmpdir(), `chunk-${i}-${Date.now()}.mp3`);
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioFilePath)
          .setStartTime(start)
          .setDuration(CHUNK_SIZE)
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('error', reject)
          .on('end', () => resolve())
          .save(chunkFile);
      });

      chunkFiles.push(chunkFile);
    }

    return chunkFiles;
  } catch (error) {
    console.error('Error splitting audio:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  // Create an array of temp files to clean up at the end
  const tempFiles: string[] = [];
  
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV === 'production') {
      // Verify authentication using Clerk
      const session = await auth();
      if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Parse and validate request
    const body = await request.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { blobUrl, extension } = result.data;

    // Download the audio file from the blob URL
    const audioResponse = await fetch(blobUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio from blob storage');
    }
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    
    // Create a temporary input file
    const tempInputFile = join(tmpdir(), `input-${Date.now()}.${extension}`);
    tempFiles.push(tempInputFile);
    // @ts-ignore - Skip type checking for this line
    await writeFile(tempInputFile, audioBuffer);
    
    // Convert to MP3 format to ensure compatibility with OpenAI
    const tempOutputFile = join(tmpdir(), `output-${Date.now()}.mp3`);
    tempFiles.push(tempOutputFile);
    
    // Convert to MP3 using ffmpeg with explicit settings for better compatibility
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputFile)
        .toFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(new Error(`FFmpeg conversion failed: ${err.message}`));
        })
        .on('end', () => resolve())
        .save(tempOutputFile);
    });
    
    // Split into chunks if needed
    const chunkFiles = await splitAudioIntoChunks(tempOutputFile, 'mp3');
    tempFiles.push(...chunkFiles);
    
    // Process chunks in parallel with rate limiting
    const transcriptionPromises = chunkFiles.map(async (chunkFile, index) => {
      // Add delay between chunks to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, index * 1000));
      
      // Read the file and convert to base64
      const fileBuffer = await readFile(chunkFile);
      const base64Data = fileBuffer.toString('base64');
      
      try {
        // Use Vercel AI SDK with OpenAI for transcription
        const { text } = await generateText({
          model: openai('gpt-4o-audio-preview'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'file',
                  data: `data:audio/mpeg;base64,${base64Data}`,
                  mimeType: 'audio/mpeg',
                },
                {
                  type: 'text',
                  text: 'Please transcribe this audio segment accurately.',
                },
              ],
            },
          ],
        });
        
        return {
          index,
          text,
          status: 'success' as const,
        };
      } catch (error) {
        console.error(`Error processing chunk ${index}:`, error);
        return {
          index,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error' as const,
        };
      }
    });

    // Process all chunks in parallel and wait for all to complete
    const results = await Promise.all(transcriptionPromises);
    
    // Check for any failed chunks
    const failedChunks = results.filter(r => r.status === 'error');
    if (failedChunks.length > 0) {
      const errorMessages = failedChunks
        .map(chunk => `Chunk ${chunk.index}: ${chunk.error}`)
        .join('\n');
      throw new Error(`Some chunks failed to process:\n${errorMessages}`);
    }
    
    // Stream results back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Sort results by index to maintain order
          const sortedResults = results
            .filter((r): r is { index: number; text: string; status: 'success' } => r.status === 'success')
            .sort((a, b) => a.index - b.index);
          
          for (const result of sortedResults) {
            controller.enqueue(encoder.encode(result.text + " "));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Clean up temp files
    await Promise.all(tempFiles.map(file => unlink(file).catch(() => {})));
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Try to clean up temp files even if there was an error
    await Promise.all(tempFiles.map(file => unlink(file).catch(() => {})));
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process audio' },
      { status: 500 }
    );
  }
} 
