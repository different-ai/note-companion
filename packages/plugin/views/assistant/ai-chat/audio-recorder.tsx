import React, { useRef, useState, useEffect } from "react";
import { Button } from "./button";
import { Loader, Loader2, MicIcon, StopCircle } from "lucide-react";
import { logger } from "../../../services/logger";
import { usePlugin } from "../provider";
import { cn } from "../../../lib/utils";

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  debug?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptionComplete,
  debug = false,
}) => {
  const plugin = usePlugin();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<
    Array<{ url: string; timestamp: string }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const startRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Set specific options for better audio quality
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;

      audioChunks.current = [];
      // Collect data more frequently (every 250ms)
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      // Start recording with timeslice to get data frequently
      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (error) {
      logger.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!mediaRecorderRef.current) return;

    try {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);

      await new Promise<void>((resolve, reject) => {
        mediaRecorderRef.current!.onstop = async () => {
          try {
            if (audioChunks.current.length === 0) {
              throw new Error("No audio data recorded");
            }

            const webmBlob = new Blob(audioChunks.current, {
              type: "audio/webm",
            });

            if (debug) {
              const url = URL.createObjectURL(webmBlob);
              setAudioUrl(url);
              setRecordings(prev => [
                ...prev,
                {
                  url,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }

            // Send WebM directly
            const base64Audio = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(webmBlob);
            });

            const response = await fetch(
              `${plugin.getServerUrl()}/api/transcribe`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${plugin.settings.API_KEY}` },
                body: JSON.stringify({
                  audio: base64Audio,
                  extension: "webm",
                }),
              }
            );

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Transcription failed");
            }

            const data = await response.json();
            onTranscriptionComplete(data.text);
            resolve();
          } catch (error) {
            logger.error("Error processing audio:", error);
            reject(error);
          } finally {
            setIsProcessing(false);
          }
        };
      });
    } catch (error) {
      logger.error("Recording error:", error);
      setIsProcessing(false);
    }
  };

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      recordings.forEach(recording => {
        URL.revokeObjectURL(recording.url);
      });
    };
  }, [recordings]);

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          // box shadow none
          "bg-transparent opacity-50 cursor-pointer  ",
          "hover:opacity-100 hover:shadow-none",
          "shadow-none disabled:shadow-none disabled:cursor-not-allowed",
          {
            "cursor-wait": isProcessing
          }
        )}
        title={
          isProcessing
            ? "Processing audio..."
            : isRecording
            ? "Stop Recording"
            : "Start Recording"
        }
        disabled={isProcessing }
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <StopCircle className="w-4 h-4" />
        ) : (
          <MicIcon className="w-4 h-4" />
        )}
      </Button>

      {debug && recordings.length > 0 && (
        <div className="flex flex-col gap-2 p-2 rounded bg-[--background-secondary]">
          <h3 className="text-[--text-muted] text-sm">Recording History</h3>
          {recordings.map((recording, index) => (
            <div key={recording.timestamp} className="flex items-center gap-2">
              <span className="text-xs text-[--text-muted]">
                {recording.timestamp}
              </span>
              <audio controls src={recording.url} className="h-8" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
