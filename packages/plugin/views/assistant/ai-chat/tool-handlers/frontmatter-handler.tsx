import React, { useRef } from "react";
import { TFile } from "obsidian";
import { ToolHandlerProps } from "./types";

interface FrontmatterArgs {
  filePath: string;
  updates?: Record<string, any>;
  deletions?: string[];
  message: string;
}

export function FrontmatterHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);

  const updateFrontmatter = async (
    filePath: string,
    updates?: Record<string, any>,
    deletions?: string[]
  ): Promise<{ success: boolean; message: string }> => {
    const file = app.vault.getAbstractFileByPath(filePath);
    
    if (!(file instanceof TFile)) {
      return {
        success: false,
        message: `File not found: ${filePath}`,
      };
    }

    try {
      await app.fileManager.processFrontMatter(file, (frontmatter) => {
        // Add/update properties
        if (updates) {
          Object.entries(updates).forEach(([key, value]) => {
            frontmatter[key] = value;
          });
        }

        // Delete properties
        if (deletions) {
          deletions.forEach((key) => {
            delete frontmatter[key];
          });
        }
      });

      const updatesList: string[] = [];
      if (updates) {
        Object.keys(updates).forEach((key) => updatesList.push(`updated ${key}`));
      }
      if (deletions) {
        deletions.forEach((key) => updatesList.push(`removed ${key}`));
      }

      return {
        success: true,
        message: `Successfully ${updatesList.join(", ")} in ${file.basename}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating frontmatter: ${(error as Error).message}`,
      };
    }
  };

  React.useEffect(() => {
    const execute = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const args = toolInvocation.args as FrontmatterArgs;

        try {
          const result = await updateFrontmatter(
            args.filePath,
            args.updates,
            args.deletions
          );
          handleAddResult(JSON.stringify(result));
        } catch (error) {
          handleAddResult(
            JSON.stringify({
              success: false,
              message: (error as Error).message,
            })
          );
        }
      }
    };

    execute();
  }, [toolInvocation, handleAddResult, app]);

  const args = toolInvocation.args as FrontmatterArgs;
  const isComplete = "result" in toolInvocation;

  return (
    <div className="text-sm">
      <div className="text-[--text-muted] mb-1">{args.message}</div>
      <div className="text-[--text-muted] text-xs">
        {!isComplete
          ? `Updating frontmatter for ${args.filePath}...`
          : "Frontmatter updated successfully"}
      </div>
    </div>
  );
}
