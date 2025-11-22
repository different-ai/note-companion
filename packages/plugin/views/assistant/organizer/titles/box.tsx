import * as React from "react";
import { Notice, TFile } from "obsidian";
import FileOrganizer from "../../../../index";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonLoader } from "../components/skeleton-loader";
import { ExistingFolderButton } from "../components/suggestion-buttons";
import { logMessage, sanitizeFileName } from "../../../../someUtils";
import { logger } from "../../../../services/logger";

interface RenameSuggestionProps {
  plugin: FileOrganizer;
  file: TFile | null;
  content: string;
  refreshKey: number;
}

export const titleSchema = z.object({
  names: z.array(z.string().max(60)).length(3),
});

interface TitleSuggestion {
  score: number;
  title: string;
  reason: string;
}

export const RenameSuggestion: React.FC<RenameSuggestionProps> = ({
  plugin,
  file,
  content,
  refreshKey,
}) => {
  const [suggestions, setSuggestions] = React.useState<TitleSuggestion[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | null>(null);

  const suggestTitles = React.useCallback(async () => {
    if (!file) return;
    setSuggestions([]);
    setLoading(true);
    setError(null);

    try {
      const titles = await plugin.recommendName(content, file.name);
      // remove current file name from suggestions
      const filteredTitles = titles.filter(title => title.title !== file.name);
      setSuggestions(filteredTitles);
    } catch (err) {
      logger.error("Error fetching titles:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [file, plugin]);

  React.useEffect(() => {
    suggestTitles();
  }, [suggestTitles, refreshKey]);

  const handleTitleApply = async (title: string) => {
    // if same title, do nothing
    logMessage({ title, fileName: file?.basename });
    if (title === file?.basename) return;
    if (!file?.parent) return;

    // Sanitize the title to replace invalid characters with dashes
    const sanitizedTitle = sanitizeFileName(title);

    setLoading(true);
    try {
      await plugin.moveFile(file, sanitizedTitle, file.parent.path);
      new Notice(`Renamed to ${sanitizedTitle}`);
    } catch (error) {
      logger.error("Error renaming file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      new Notice(`Failed to rename: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[--background-primary-alt] text-[--text-normal] p-4 border-b border-[--background-modifier-border]">
      {loading ? (
        <SkeletonLoader count={3} rows={4} width="70%" />
      ) : error ? (
        <ErrorDisplay message={error.message} onRetry={suggestTitles} />
      ) : !suggestions.length ? (
        <div>No title suggestions available</div>
      ) : (
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence>
            {suggestions.map((suggestion, index) => (
              <ExistingFolderButton
                key={index}
                folder={suggestion.title}
                onClick={handleTitleApply}
                score={suggestion.score}
                reason={suggestion.reason}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="error-container">
    <p>Error: {message}</p>
    <button onClick={onRetry}>Retry</button>
  </div>
);
