import React, { useRef } from "react";
import { moment } from "obsidian";
import { logger } from "../../../../services/logger";
import { addFileReference, useContextItems } from "../use-context-items";
import { ToolHandlerProps } from "./types";

interface DateRangeArgs {
  startDate: string;
  endDate: string;
}

export function DateRangeHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);
  const clearAll = useContextItems(state => state.clearAll);

  const filterNotesByDateRange = async (startDate: string, endDate: string) => {
    const MAX_RESULTS = 50;
    const PREVIEW_LENGTH = 300;
    
    const files = app.vault.getMarkdownFiles();
    const start = window.moment(startDate).startOf("day");
    const end = window.moment(endDate).endOf("day");

    const filteredFiles = files.filter(file => {
      const fileDate = window.moment(file.stat.mtime);
      const isWithinDateRange = fileDate.isBetween(start, end, null, "[]");
      const isSystemFolder = file.path.startsWith(".") || 
                           file.path.includes("templates/") || 
                           file.path.includes("backup/");
      return isWithinDateRange && !isSystemFolder;
    });

    // Limit to MAX_RESULTS to prevent context overload
    const limitedFiles = filteredFiles.slice(0, MAX_RESULTS);

    return Promise.all(
      limitedFiles.map(async file => {
        const content = await app.vault.read(file);
        return {
          title: file.basename,
          content: content, // Keep for UI context
          contentPreview: content.slice(0, PREVIEW_LENGTH) + (content.length > PREVIEW_LENGTH ? '...' : ''),
          contentLength: content.length,
          wordCount: content.split(/\s+/).length,
          path: file.path,
          modified: file.stat.mtime,
          modifiedDate: new Date(file.stat.mtime).toLocaleString(),
          reference: `Date range: ${startDate} to ${endDate}`,
        };
      })
    );
  };

  React.useEffect(() => {
    const handleDateRangeSearch = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { startDate, endDate } = toolInvocation.args as DateRangeArgs;
        
        try {
          const searchResults = await filterNotesByDateRange(startDate, endDate);
          
          // Clear existing context before adding new results
          clearAll();
          
          // Add ONLY metadata to context (reference-based, ephemeral)
          // Full content is NOT stored in context
          searchResults.forEach(file => {
            addFileReference({
              path: file.path,
              title: file.title,
              contentPreview: file.contentPreview,
              contentLength: file.contentLength,
              wordCount: file.wordCount,
              modified: file.modified,
              modifiedDate: file.modifiedDate,
            });
          });
          
          // Send minimal data to AI (metadata only, no full content)
          const minimalResults = searchResults.map(({ content, ...rest }) => rest);
          handleAddResult(JSON.stringify(minimalResults));
        } catch (error) {
          logger.error("Error filtering notes by date:", error);
          handleAddResult(JSON.stringify({ error: error.message }));
        }
      }
    };

    handleDateRangeSearch();
  }, [toolInvocation, handleAddResult, app, clearAll]);

  const files = useContextItems(state => state.files);
  const fileCount = Object.keys(files).length;

  return (
    <div className="text-sm text-[--text-muted]">
      {!("result" in toolInvocation) 
        ? "Filtering notes by date range..."
        : fileCount > 0
        ? `Found ${fileCount} notes within the specified date range`
        : "No files found within the specified date range"}
    </div>
  );
} 