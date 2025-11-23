import React, { useRef } from "react";
import { App } from "obsidian";
import { logger } from "../../../../services/logger";
import { addFileContext, useContextItems } from "../use-context-items";
import { ToolHandlerProps } from "./types";

interface LastModifiedArgs {
  count: number;
}

interface FileResult {
  title: string;
  content: string;
  contentPreview?: string;
  contentLength?: number;
  wordCount?: number;
  path: string;
  modified?: number;
  modifiedDate?: string;
  reference: string;
}

export function LastModifiedHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);
  const clearAll = useContextItems(state => state.clearAll);
  const files = useContextItems(state => state.files);

  const getLastModifiedFiles = async (count: number): Promise<FileResult[]> => {
    const MAX_FILES = 20;
    const PREVIEW_LENGTH = 300;
    
    // Limit count to prevent context overload
    const limitedCount = Math.min(count, MAX_FILES);
    
    const files = app.vault.getMarkdownFiles();
    const sortedFiles = files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    const lastModifiedFiles = sortedFiles.slice(0, limitedCount);

    return Promise.all(
      lastModifiedFiles.map(async file => {
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
          reference: `Last modified: ${new Date(file.stat.mtime).toLocaleString()}`
        };
      })
    );
  };

  React.useEffect(() => {
    const handleLastModifiedSearch = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { count } = toolInvocation.args as LastModifiedArgs;
        
        try {
          const searchResults = await getLastModifiedFiles(count);
          
          // Clear existing context before adding new results
          clearAll();
          
          // Add each file to context with full content for UI
          searchResults.forEach(file => {
            addFileContext({
              path: file.path,
              title: file.title,
              content: file.content,
            });
          });
          
          // Send minimal data to AI (without full content)
          const minimalResults = searchResults.map(({ content, ...rest }) => rest);
          
          handleAddResult(JSON.stringify({
            success: true,
            files: minimalResults,
            count: searchResults.length
          }));
        } catch (error) {
          logger.error("Error getting last modified files:", error);
          handleAddResult(JSON.stringify({ 
            success: false,
            error: error.message 
          }));
        }
      }
    };

    handleLastModifiedSearch();
  }, [toolInvocation, handleAddResult, app, clearAll]);

  // Use the files object directly from context instead of items
  const fileCount = Object.keys(files).length;

  return (
    <div className="text-sm text-[--text-muted]">
      {!("result" in toolInvocation) ? (
        "Fetching last modified files..."
      ) : fileCount > 0 ? (
        `Found ${fileCount} recently modified files`
      ) : (
        "No recently modified files found"
      )}
    </div>
  );
} 