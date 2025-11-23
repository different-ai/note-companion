import React, { useRef } from "react";
import { App, TFile } from "obsidian";
import { ToolInvocation } from "ai";

interface OutgoingLinksHandlerProps {
  toolInvocation: ToolInvocation;
  handleAddResult: (result: string) => void;
  app: App;
}

export function OutgoingLinksHandler({
  toolInvocation,
  handleAddResult,
  app,
}: OutgoingLinksHandlerProps) {
  const hasFetchedRef = useRef(false);

  const getOutgoingLinks = (
    filePath: string,
    includeEmbeds: boolean,
    resolvedOnly: boolean
  ) => {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      return {
        path: filePath,
        success: false,
        error: "File not found",
      };
    }

    const cache = app.metadataCache.getFileCache(file);
    if (!cache) {
      return {
        path: filePath,
        success: true,
        links: [],
        embeds: [],
        totalLinks: 0,
        totalEmbeds: 0,
      };
    }

    // Get outgoing links
    const links = (cache.links || []).map((link) => ({
      link: link.link,
      displayText: link.displayText,
      resolved: app.metadataCache.getFirstLinkpathDest(link.link, filePath) !== null,
    }));

    // Filter by resolved status if requested
    const filteredLinks = resolvedOnly
      ? links.filter((l) => l.resolved)
      : links;

    // Get embeds (images, PDFs, other files)
    let embeds: Array<{ link: string; displayText?: string; resolved: boolean }> = [];
    if (includeEmbeds) {
      embeds = (cache.embeds || []).map((embed) => ({
        link: embed.link,
        displayText: embed.displayText,
        resolved: app.metadataCache.getFirstLinkpathDest(embed.link, filePath) !== null,
      }));

      if (resolvedOnly) {
        embeds = embeds.filter((e) => e.resolved);
      }
    }

    return {
      path: filePath,
      success: true,
      links: filteredLinks,
      embeds,
      totalLinks: filteredLinks.length,
      totalEmbeds: embeds.length,
    };
  };

  React.useEffect(() => {
    const handleGetOutgoingLinks = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { filePaths, includeEmbeds, resolvedOnly } = toolInvocation.args;

        try {
          const results = filePaths.map((path: string) =>
            getOutgoingLinks(
              path,
              includeEmbeds !== false,
              resolvedOnly || false
            )
          );
          handleAddResult(JSON.stringify(results));
        } catch (error) {
          handleAddResult(
            JSON.stringify({
              error: `Failed to get outgoing links: ${error.message}`,
            })
          );
        }
      }
    };

    handleGetOutgoingLinks();
  }, [toolInvocation, handleAddResult, app]);

  const { filePaths } = toolInvocation.args;
  const isComplete = "result" in toolInvocation;

  return (
    <div className="text-sm">
      {!isComplete ? (
        <div className="text-[--text-muted]">
          Analyzing outgoing links for {filePaths.length} file(s)...
        </div>
      ) : (
        <div className="text-[--text-normal]">
          ✓ Outgoing links retrieved for {filePaths.length} file(s)
        </div>
      )}
    </div>
  );
}
