import * as React from "react";
import { TFile, Notice } from "obsidian";
import FileOrganizer from "../../../../index";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonLoader } from "../components/skeleton-loader";
import { FolderSuggestion } from "../../../../index";
import { logMessage } from "../../../../someUtils";
import { ExistingFolderButton, NewFolderButton } from "../components/suggestion-buttons";
import { logger } from "../../../../services/logger";

interface SimilarFolderBoxProps {
  plugin: FileOrganizer;
  file: TFile | null;
  content: string;
  refreshKey: number;
}

export const SimilarFolderBox: React.FC<SimilarFolderBoxProps> = ({
  plugin,
  file,
  content,
  refreshKey,
}) => {
  const [suggestions, setSuggestions] = React.useState<FolderSuggestion[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const suggestFolders = React.useCallback(async () => {
    if (!file) return;
    setSuggestions([]);
    setLoading(true);
    setError(null);
    // cut content length to only first 50k/4 chars 
    const truncatedContent = content.slice(0, 50000);
    try {
      const folderSuggestions = await plugin.recommendFolders(
        truncatedContent,
        file.path
      );


      // Get all valid folders
      const validFolders = plugin.getAllUserFolders();

      // Filter suggestions to only include existing folders or new folders
      const filteredSuggestions = folderSuggestions.filter(
        suggestion =>
          suggestion.isNewFolder || validFolders.includes(suggestion.folder)
      );

      setSuggestions(filteredSuggestions);
    } catch (err) {
      logger.error("Error fetching folders:", err);
      const errorMessage =
        typeof err === "object" && err !== null
          ? err.error?.message || err.error || err.message || "Unknown error"
          : String(err);

      setError(new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [content, file, plugin]);

  React.useEffect(() => {
    suggestFolders();
  }, [suggestFolders, refreshKey]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    suggestFolders();
  };

  const handleFolderClick = async (folder: string) => {
    // if same folder, do nothing
    logMessage({ newFolder: folder, currentFolder: file?.parent?.path });
    if (folder === file?.parent?.path) return;
    if (!file) return;

    setLoading(true);
    try {
      await plugin.moveFile(file, file.basename, folder);
      new Notice(`Moved ${file.basename} to ${folder}`);
    } catch (error) {
      logger.error("Error moving file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      new Notice(
        `Failed to move ${file.basename} to ${folder}: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };
  const filteredSuggestions = suggestions.filter(
    s => s.folder !== file?.parent?.path
  );

  // Derive existing and new folders from suggestions
  const existingFolders = filteredSuggestions.filter(s => !s.isNewFolder);
  const newFolders = filteredSuggestions.filter(s => s.isNewFolder);

  const renderError = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-md  border-opacity-20"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[--text-error] font-medium mb-1">
            Error: Failed to fetch
          </div>
          <p className="text-sm text-[--text-muted]">
            {error?.message || "An unexpected error occurred"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            disabled={loading}
            className="px-3 py-1.5 bg-[--interactive-accent] text-[--text-on-accent] rounded hover:bg-[--interactive-accent-hover] disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? "Retrying..." : "Retry"}
          </button>
          <button
            onClick={() => setError(null)}
            className="px-3 py-1.5 border border-[--background-modifier-border] rounded hover:bg-[--background-modifier-hover] transition-colors duration-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    if (loading) {
      return <SkeletonLoader count={4} width="100px" height="30px" rows={1} />;
    }

    if (error) {
      return renderError();
    }

    if (existingFolders.length === 0 && newFolders.length === 0) {
      return (
        <div className="text-[--text-muted] p-2">No suitable folders found</div>
      );
    }

    return (
      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {existingFolders.map((folder, index) => (
            <ExistingFolderButton
              key={`existing-${index}`}
              folder={folder.folder}
              onClick={handleFolderClick}
              score={folder.score}
              reason={folder.reason}
            />
          ))}
          {newFolders.map((folder, index) => (
            <NewFolderButton
              key={`new-${index}`}
              folder={folder.folder}
              onClick={handleFolderClick}
              score={folder.score}
              reason={folder.reason}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="bg-[--background-primary-alt] text-[--text-normal] p-4 border-b border-[--background-modifier-border]">
      {renderContent()}
    </div>
  );
};
