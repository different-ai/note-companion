import React, { useRef } from "react";
import { logger } from "../../../../services/logger";
import { addSearchContext, useContextItems } from "../use-context-items";
import { ToolHandlerProps } from "./types";

interface SearchArgs {
  query: string;
}

export function SearchHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);

  const searchNotes = async (query: string) => {
    const MAX_RESULTS = 10;
    const PREVIEW_LENGTH = 500;
    
    const files = app.vault.getMarkdownFiles();
    const searchTerms = query.toLowerCase().split(/\s+/);

    const searchResults = await Promise.all(
      files.map(async file => {
        const content = await app.vault.read(file);
        const lowerContent = content.toLowerCase();

        const allTermsPresent = searchTerms.every(term => {
          const regex = new RegExp(`(^|\\W)${term}(\\W|$)`, "i");
          return regex.test(lowerContent);
        });

        if (allTermsPresent) {
          return {
            title: file.basename,
            contentPreview: content.slice(0, PREVIEW_LENGTH) + (content.length > PREVIEW_LENGTH ? '...' : ''),
            contentLength: content.length,
            wordCount: content.split(/\s+/).length,
            path: file.path,
            // Keep full content for context UI, but don't send to AI
            content: content,
          };
        }
        return null;
      })
    );

    const filteredResults = searchResults.filter((result): result is NonNullable<typeof result> => 
      result !== null
    );
    
    // Limit to MAX_RESULTS
    return filteredResults.slice(0, MAX_RESULTS);
  };

  React.useEffect(() => {
    const handleSearchNotes = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { query } = toolInvocation.args as SearchArgs;
        
        try {
          const searchResults = await searchNotes(query);
          
          // Add search results to context (with full content for UI)
          addSearchContext(query, searchResults);
          
          // Send minimal data to AI (without full content)
          const minimalResults = searchResults.map(({ content, ...rest }) => rest);
          handleAddResult(JSON.stringify(minimalResults));
        } catch (error) {
          logger.error("Error searching notes:", error);
          handleAddResult(JSON.stringify({ error: error.message }));
        }
      }
    };

    handleSearchNotes();
  }, [toolInvocation, handleAddResult, app]);

  const searchResults = useContextItems(state => state.searchResults);

  return (
    <div className="text-sm text-[--text-muted]">
      {!("result" in toolInvocation)
        ? "Searching through your notes..."
        : Object.keys(searchResults).length > 0
        ? `Found ${Object.keys(searchResults).length} matching notes`
        : "No files matching that criteria were found"}
    </div>
  );
}
