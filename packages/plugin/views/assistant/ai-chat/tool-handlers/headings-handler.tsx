import React, { useRef } from "react";
import { App, TFile } from "obsidian";
import { ToolInvocation } from "ai";

interface HeadingsHandlerProps {
  toolInvocation: ToolInvocation;
  handleAddResult: (result: string) => void;
  app: App;
}

export function HeadingsHandler({
  toolInvocation,
  handleAddResult,
  app,
}: HeadingsHandlerProps) {
  const hasFetchedRef = useRef(false);

  const getHeadings = (
    filePath: string,
    minLevel: number = 1,
    maxLevel: number = 6
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
        headings: [],
        totalHeadings: 0,
      };
    }

    const headings =
      cache.headings
        ?.filter((h) => h.level >= minLevel && h.level <= maxLevel)
        .map((h) => ({
          level: h.level,
          heading: h.heading,
          position: {
            start: h.position.start,
            end: h.position.end,
          },
        })) || [];

    return {
      path: filePath,
      success: true,
      headings,
      totalHeadings: headings.length,
    };
  };

  React.useEffect(() => {
    const handleGetHeadings = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { filePaths, minLevel, maxLevel } = toolInvocation.args;

        try {
          const results = filePaths.map((path: string) =>
            getHeadings(path, minLevel || 1, maxLevel || 6)
          );
          handleAddResult(JSON.stringify(results));
        } catch (error) {
          handleAddResult(
            JSON.stringify({
              error: `Failed to get headings: ${error.message}`,
            })
          );
        }
      }
    };

    handleGetHeadings();
  }, [toolInvocation, handleAddResult, app]);

  const { filePaths } = toolInvocation.args;
  const isComplete = "result" in toolInvocation;

  return (
    <div className="text-sm">
      {!isComplete ? (
        <div className="text-[--text-muted]">
          Extracting headings from {filePaths.length} file(s)...
        </div>
      ) : (
        <div className="text-[--text-normal]">
          ✓ Headings extracted from {filePaths.length} file(s)
        </div>
      )}
    </div>
  );
}
