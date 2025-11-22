import * as React from "react";
import { TFile, Notice } from "obsidian";
import FileOrganizer from "../../../index";
import { logger } from "../../../services/logger";

interface TranscriptionButtonProps {
  plugin: FileOrganizer;
  file: TFile;
  content: string;
}

export const TranscriptionButton: React.FC<TranscriptionButtonProps> = ({ plugin, file, content }) => {
  const [transcribing, setTranscribing] = React.useState<boolean>(false);

  const handleTranscribe = async () => {
    setTranscribing(true);
    try {
      const audioRegex = /!\[\[(.*?\.(mp3|wav|m4a|ogg|webm))]]/gi;
      const matches = Array.from(content.matchAll(audioRegex));

      if (matches.length === 0) {
        new Notice("No audio files found");
        return;
      }

      for (const match of matches) {
        const audioFileName = match[1];
        const audioFile = plugin.app.metadataCache.getFirstLinkpathDest(
          audioFileName,
          "."
        );

        if (!(audioFile instanceof TFile)) {
          logger.error(`Audio file not found: ${audioFileName}`);
          new Notice(`Audio file not found: ${audioFileName}`);
          continue;
        }

        const transcript = await plugin.generateTranscriptFromAudio(audioFile);
        await plugin.appendTranscriptToActiveFile(
          file,
          audioFileName,
          transcript
        );
        new Notice(`Transcript added for: ${audioFileName}`);
      }
      
      new Notice(`Completed transcribing ${matches.length} audio files`);
    } catch (error) {
      logger.error("Error transcribing audio:", error);
      new Notice("Error transcribing audio");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <button
      className="flex items-center gap-2 bg-[--interactive-accent] text-[--text-on-accent] px-4 py-2 hover:bg-[--interactive-accent-hover] disabled:opacity-50"
      onClick={handleTranscribe}
      disabled={transcribing}
    >
      {transcribing ? (
        <>
          <span className="animate-spin">⟳</span>
          <span>Transcribing...</span>
        </>
      ) : (
        "Transcribe Audio"
      )}
    </button>
  );
};