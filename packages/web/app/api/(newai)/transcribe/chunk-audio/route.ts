import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// Removed unused import for 'fetch'
import ffmpeg from 'fluent-ffmpeg';
// Added type declaration for 'fluent-ffmpeg'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File | null;
    const audioUrl = formData.get('audioUrl') as string | null;

    if (!audioFile && !audioUrl) {
      return NextResponse.json({ error: 'Either an audio file or a URL is required' }, { status: 400 });
    }

    let audioPathOrUrl: string;

    if (audioFile) {
      console.log('Received audio file for processing.');
      const tempFilePath = path.join('/tmp', `${Date.now()}_${audioFile.name}`);
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      await fs.promises.writeFile(tempFilePath, buffer);
      audioPathOrUrl = tempFilePath;
    } else if (audioUrl) {
      console.log('Received audio URL for processing.');
      audioPathOrUrl = audioUrl;
    } else {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    console.log(`Processing audio: ${audioPathOrUrl}`);

    // Process the audio file or URL and get the chunked file paths
    const chunkPaths = await AudioChunker.processAllFiles(audioPathOrUrl);

    console.log('Processing complete. Returning chunk paths.');

    return NextResponse.json({ chunkPaths });
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ error: 'Failed to process audio' }, { status: 500 });
  }
}

class AudioChunker {
  // Supported audio formats for processing
  private static readonly ALLOWED_FORMATS = [
    "flac", "m4a", "mp3", "mp4",
    "mpeg", "mpga", "oga", "ogg",
    "wav", "webm"
  ];

  // Constants for silence detection and file limits
  private static readonly SILENCE_THRESHOLD = -30; // dB
  private static readonly SILENCE_DURATION = 0.5; // seconds
  private static readonly MAX_DURATION = 20 * 60; // 20 minutes in seconds
  private static readonly MAX_SIZE_MB = 25; // 25 MB maximum file size
  private static readonly MAX_SIZE_BYTES = AudioChunker.MAX_SIZE_MB * 1024 * 1024; // Convert MB to bytes
  private static readonly TARGET_START_RATIO = 0.95; // Look for silence at 95% of MAX_DURATION

  // Sets to track processed files and final output chunks
  private static readonly PROCESSED_FILES = new Set<string>();
  private static readonly FINAL_CHUNKS = new Set<AudioChunker.FileInfo>();

  // Set ffmpeg path during class initialization
  static {
    // Define the path to the ffmpeg binary
    const ffmpegPath = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
    ffmpeg.setFfmpegPath(ffmpegPath);
  }

  // Private constructor to prevent instantiation
  private constructor() { }

  // Detect silence points in the audio file within a target range
  private static async detectSilence(audioPath: string, targetStart: number, targetEnd: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const silencePoints: number[] = [];

      ffmpeg(audioPath)
        .audioFilters(`silencedetect=n=${AudioChunker.SILENCE_THRESHOLD}dB:d=${AudioChunker.SILENCE_DURATION}`)
        .format('null')
        .on('stderr', (line) => {
          const silenceStartMatch = line.match(/silence_start: ([0-9.]+)/);
          if (silenceStartMatch) {
            const point = parseFloat(silenceStartMatch[1]);
            if (point >= targetStart && point <= targetEnd) {
              silencePoints.push(point);
            }
          }
        })
        .on('end', () => resolve(silencePoints))
        .on('error', (err) => reject(err))
        .saveToFile('/dev/null');
    });
  }

  // Cut a segment of the audio file and save it to a new file
  private static async cutAudio(audioPath: string, outputPath: string, startTime: number, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .setStartTime(startTime)
        .duration(duration)
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  // Get the duration of the audio file
  private static async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata.format.duration as number);
      });
    });
  }

  // Get the file size in bytes
  private static getFileSize(filePath: string): number {
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  // Retrieve file information including duration, size, and original file name
  private static async getFileInfo(filePath: string): Promise<AudioChunker.FileInfo> {
    const duration = await AudioChunker.getAudioDuration(filePath);
    const size = AudioChunker.getFileSize(filePath) / (1024 * 1024); // Convert to MB

    return {
      path: filePath,
      name: path.basename(filePath),
      duration,
      size,
      originalFile: path.basename(filePath).split('_part')[0] + path.extname(filePath)
    };
  }

  // Remove a file from the final chunks set
  private static removeFromFinalChunks(filePath: string): void {
    for (const chunk of AudioChunker.FINAL_CHUNKS) {
      if (chunk.path === filePath) {
        AudioChunker.FINAL_CHUNKS.delete(chunk);
        return;
      }
    }
  }

  // Main logic to chunk audio files based on duration and size limits
  private static async chunkAudio(audioPathOrUrl: string): Promise<string[]> {
    let audioPath = audioPathOrUrl;
    const chunkPaths: string[] = [];

    // Check if the input is a URL
    if (audioPathOrUrl.startsWith('http://') || audioPathOrUrl.startsWith('https://')) {
      console.log(`Downloading audio from URL: ${audioPathOrUrl}`);
      const tempFilePath = path.join('/tmp', `audio_${Date.now()}${path.extname(audioPathOrUrl)}`);

      // Download and save file concurrently
      const downloadPromise = fetch(audioPathOrUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to download audio from URL: ${audioPathOrUrl}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          const buffer = Buffer.from(arrayBuffer);
          return fs.promises.writeFile(tempFilePath, new Uint8Array(buffer));
        })
        .then(() => {
          console.log(`Downloaded audio to temporary file: ${tempFilePath}`);
          audioPath = tempFilePath;
        });

      // Wait for download completion
      await downloadPromise;
    }

    // Check if the audio file is under the limits before processing
    const audioFileInfo = await AudioChunker.getFileInfo(audioPath);

    if (audioFileInfo.duration <= AudioChunker.MAX_DURATION && audioFileInfo.size <= AudioChunker.MAX_SIZE_MB) {
      console.log(`✅ File is already under limits. No chunking needed.`);
      AudioChunker.FINAL_CHUNKS.add(audioFileInfo);
      chunkPaths.push(audioFileInfo.path);
      return chunkPaths;
    }

    if (AudioChunker.PROCESSED_FILES.has(audioPath)) {
      console.log(`Skipping already processed file: ${audioPath}`);
      return chunkPaths;
    }

    AudioChunker.PROCESSED_FILES.add(audioPath);

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Input file does not exist: ${audioPath}`);
    }

    const ext = path.extname(audioPath).slice(1).toLowerCase();
    if (!AudioChunker.ALLOWED_FORMATS.includes(ext)) {
      throw new Error(`Unsupported file format: .${ext}`);
    }

    // Convert to mp3 for compatibility with ffmpeg if needed
    const mp3Path = path.join(path.dirname(audioPath), `${path.basename(audioPath, path.extname(audioPath))}.mp3`);
    if (ext !== 'mp3') {
      console.log(`Converting ${audioPath} to mp3 format for compatibility...`);
      await new Promise((resolve, reject) => {
        ffmpeg(audioPath)
          .toFormat('mp3')
          .output(mp3Path)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      console.log(`Conversion complete: ${mp3Path}`);
      audioPath = mp3Path;
    }

    const fileInfo = await AudioChunker.getFileInfo(audioPath);
    console.log(`Processing file: ${audioPath}`);

    if (fileInfo.duration <= AudioChunker.MAX_DURATION && fileInfo.size <= AudioChunker.MAX_SIZE_MB) {
      console.log(`✅ File is already under limits. No chunking needed.`);
      chunkPaths.push(audioPath);
      return chunkPaths;
    }

    // Calculate maximum duration based on size if size exceeds limit
    let maxDurationForSize: number | undefined;
    if (fileInfo.size > AudioChunker.MAX_SIZE_MB) {
      const bytesPerSecond = AudioChunker.getFileSize(audioPath) / fileInfo.duration;
      maxDurationForSize = (AudioChunker.MAX_SIZE_BYTES * 0.95) / bytesPerSecond;
      console.log(`File size limit reached. Recommended duration cut: ${maxDurationForSize.toFixed(2)}s`);
    }

    const effectiveMaxDuration = maxDurationForSize && maxDurationForSize < AudioChunker.MAX_DURATION
      ? maxDurationForSize
      : AudioChunker.MAX_DURATION;

    // Detect silence points within the target range concurrently
    const targetStart = AudioChunker.TARGET_START_RATIO * effectiveMaxDuration;
    const targetEnd = effectiveMaxDuration;

    // Parallel processing of silence detection and chunking logic
    const [silencePoints] = await Promise.all([
      AudioChunker.detectSilence(audioPath, targetStart, targetEnd),
      // You can perform other asynchronous tasks concurrently here (e.g., preparing other cuts).
    ]);

    console.log('Detected silence points in target range:', silencePoints.map(p => p.toFixed(2)));

    // Determine the cut point based on silence detection
    let cutPoint = effectiveMaxDuration;
    if (silencePoints.length > 0) {
      cutPoint = silencePoints[0];
      console.log(`Found good silence point at ${cutPoint.toFixed(2)} seconds`);
    } else {
      console.log(`No ideal silence points found, forcing cut at ${cutPoint.toFixed(2)} seconds`);
    }

    const baseName = path.basename(audioPath, path.extname(audioPath));
    const outputDir = path.dirname(audioPath);

    // Generate output file names for the chunks
    const firstChunk = path.join(outputDir, `${baseName}_part1${path.extname(audioPath)}`);
    const secondChunk = path.join(outputDir, `${baseName}_part2${path.extname(audioPath)}`);

    console.log(`Cutting at ${cutPoint.toFixed(2)} seconds...`);

    // Run chunking in parallel
    const chunkPromises = [
      AudioChunker.cutAudio(audioPath, firstChunk, 0, cutPoint),
      AudioChunker.cutAudio(audioPath, secondChunk, cutPoint, fileInfo.duration - cutPoint),
    ];

    await Promise.all(chunkPromises);

    console.log('✅ Audio chunked into:');
    console.log('   -', firstChunk);
    console.log('   -', secondChunk);

    const chunkInfos = await Promise.all([
      AudioChunker.getFileInfo(firstChunk),
      AudioChunker.getFileInfo(secondChunk),
    ]);

    console.log(`   - First chunk: ${chunkInfos[0].size.toFixed(2)} MB, ${chunkInfos[0].duration.toFixed(2)}s`);
    console.log(`   - Second chunk: ${chunkInfos[1].size.toFixed(2)} MB, ${chunkInfos[1].duration.toFixed(2)}s`);

    AudioChunker.removeFromFinalChunks(audioPath);
    chunkPaths.push(firstChunk, secondChunk);

    // Recursively process chunks if they still exceed limits
    const chunksToProcess: string[] = [];
    const intermediatesToRemove: string[] = [];

    // Process chunks concurrently
    const chunkProcessingPromises = chunkInfos.map(async (chunkInfo, index) => {
      const chunk = index === 0 ? firstChunk : secondChunk;

      if (chunkInfo.duration > AudioChunker.MAX_DURATION || chunkInfo.size > AudioChunker.MAX_SIZE_MB) {
        chunksToProcess.push(chunk);
        intermediatesToRemove.push(chunk);
      }
    });

    await Promise.all(chunkProcessingPromises);

    // Remove intermediate files and process further chunks in parallel
    const subChunkProcessingPromises = chunksToProcess.map(async chunk => {
      console.log(`\nRecursively processing chunk: ${chunk}`);
      const subChunks = await AudioChunker.chunkAudio(chunk);
      chunkPaths.push(...subChunks);
    });

    await Promise.all(subChunkProcessingPromises);

    // Remove intermediate files from memory and chunkPaths
    const removeIntermediatesPromises = intermediatesToRemove.map(async intermediate => {
      console.log(`Removing intermediate file: ${intermediate}`);
      AudioChunker.removeFromFinalChunks(intermediate);
      const index = chunkPaths.indexOf(intermediate);
      if (index > -1) {
        chunkPaths.splice(index, 1);
      }
    });

    await Promise.all(removeIntermediatesPromises);

    return chunkPaths;
  }


  // Print a summary of the final audio chunks
  private static printChunkSummary(): void {
    console.log('\n=======================================');
    console.log('🎵 FINAL AUDIO CHUNKS SUMMARY 🎵');
    console.log('=======================================');

    const finalChunksArray = Array.from(AudioChunker.FINAL_CHUNKS);

    // Sort chunks by original file and path
    finalChunksArray.sort((a, b) => {
      if (a.originalFile !== b.originalFile) {
        return a.originalFile.localeCompare(b.originalFile);
      }
      return a.path.localeCompare(b.path);
    });

    // Group chunks by original file
    const groupedChunks: Record<string, AudioChunker.FileInfo[]> = {};
    finalChunksArray.forEach(chunk => {
      if (!groupedChunks[chunk.originalFile]) {
        groupedChunks[chunk.originalFile] = [];
      }
      groupedChunks[chunk.originalFile].push(chunk);
    });

    // Print grouped chunk information
    Object.keys(groupedChunks).forEach(originalFile => {
      console.log(`\nOriginal file: ${originalFile}`);
      console.log('  Resulting chunks:');

      groupedChunks[originalFile].forEach(chunk => {
        const minutes = Math.floor(chunk.duration / 60);
        const seconds = Math.floor(chunk.duration % 60).toString().padStart(2, '0');

        console.log(`  - ${chunk.name} (${chunk.size.toFixed(2)} MB, ${minutes}:${seconds})`);
      });

      console.log(`  Total chunks: ${groupedChunks[originalFile].length}`);
    });

    console.log('\n=======================================');
    console.log(`Total original files processed: ${Object.keys(groupedChunks).length}`);
    console.log(`Total final chunks generated: ${finalChunksArray.length}`);
    console.log('=======================================');
  }

  static async processAllFiles(inputPath: string): Promise<string[]> {
    try {
      // Clear previous processing state
      AudioChunker.PROCESSED_FILES.clear();
      AudioChunker.FINAL_CHUNKS.clear();

      console.log(`Starting to process: ${inputPath}`);
      console.log(`Max duration: ${AudioChunker.MAX_DURATION / 60} minutes`);
      console.log(`Max file size: ${AudioChunker.MAX_SIZE_MB} MB`);

      // Start chunking the audio file
      const chunkPaths = await AudioChunker.chunkAudio(inputPath);

      console.log(`\n✅ All processing complete. No chunks exceed ${AudioChunker.MAX_DURATION / 60} minutes or ${AudioChunker.MAX_SIZE_MB} MB.`);
      return chunkPaths;
    } catch (err) {
      console.error('❌ Error:', err);
      throw err; // Re-throw the error for proper handling
    }
  }
}
