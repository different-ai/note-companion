import React, { useRef, useState } from "react";
import { getYouTubeTranscript, getYouTubeVideoTitle } from "../youtube-transcript";
import { logger } from "../../../../services/logger";
import { addYouTubeContext } from "../use-context-items";

interface YouTubeHandlerProps {
  toolInvocation: any;
  handleAddResult: (result: string) => void;
}

export function YouTubeHandler({
  toolInvocation,
  handleAddResult,
}: YouTubeHandlerProps) {
  const hasFetchedRef = useRef(false);
  const [fetchSuccess, setFetchSuccess] = useState<boolean | null>(null);

  React.useEffect(() => {
    const handleYouTubeTranscript = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { videoId } = toolInvocation.args;
        try {
          const transcript = await getYouTubeTranscript(videoId);
          const title = await getYouTubeVideoTitle(videoId);
          
          // Add full transcript to context for AI to access
          addYouTubeContext({
            videoId,
            title,
            transcript
          });
          
          const wordCount = transcript.split(/\s+/).length;
          
          // Return success message without full transcript
          // AI can access full transcript from context if needed
          handleAddResult(JSON.stringify({ 
            success: true,
            title, 
            videoId,
            wordCount,
            message: `Successfully retrieved YouTube transcript for "${title}" (${wordCount} words)`
          }));
          setFetchSuccess(true);
        } catch (error) {
          logger.error("Error fetching YouTube transcript:", error);
          handleAddResult(JSON.stringify({ error: error.message }));
          setFetchSuccess(false);
        }
      }
    };

    handleYouTubeTranscript();
  }, [toolInvocation, handleAddResult]);

  if (fetchSuccess === null) {
    return <div className="text-sm text-[--text-muted]">Fetching the video transcript...</div>;
  }

  if (fetchSuccess) {
    return <div className="text-sm text-[--text-muted]">YouTube transcript successfully retrieved</div>;
  }

  return <div className="text-sm text-[--text-error]">Failed to fetch YouTube transcript</div>;
} 