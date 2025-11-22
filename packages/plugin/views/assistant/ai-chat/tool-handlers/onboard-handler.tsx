import React, { useState } from "react";
import { TFile, TFolder } from "obsidian";
import { ToolHandlerProps } from "./types";
import { useContextItems } from "../use-context-items";
import { usePlugin } from "../../provider";

export function OnboardHandler({
  toolInvocation,
  handleAddResult,
}: ToolHandlerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const { toggleLightweightMode } = useContextItems();
  const plugin = usePlugin();

  const getFilesFromPath = (path: string): TFile[] => {
    const allUserFiles = plugin.getAllUserMarkdownFiles();

    if (path === "/") {
      return allUserFiles;
    }

    // Filter files that belong to the specified path
    return allUserFiles.filter(file => {
      const filePath = file.path;
      return filePath.startsWith(path + "/") || filePath === path;
    });
  };

  const analyzeFolderStructure = async (
    path: string,
    depth = 0,
    maxDepth = 3
  ) => {
    toggleLightweightMode();

    const files = getFilesFromPath(path);
    const structure = {
      path,
      files: await Promise.all(
        files.map(async file => {
          const fileData = {
            name: file.name,
            path: file.path,
            type: "file" as const,
            depth: depth + 1,
          };
          return fileData;
        })
      ),
      subfolders: [],
      depth,
    };

    if (depth < maxDepth && path !== "/") {
      // Get all user folders at current path
      const userFolders = plugin.getAllUserFolders().filter(folderPath => {
        // Only include direct subfolders of current path
        const isSubfolder = folderPath.startsWith(path + "/");
        const folderDepth = folderPath.split("/").length;
        const currentDepth = path.split("/").length;
        return isSubfolder && folderDepth === currentDepth + 1;
      });

      // Analyze each subfolder
      for (const folderPath of userFolders) {
        const subStructure = await analyzeFolderStructure(
          folderPath,
          depth + 1,
          maxDepth
        );
        structure.subfolders.push(subStructure);
      }
    }

    return structure;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    toggleLightweightMode();
    try {
      const { path = "/", maxDepth = 3 } = toolInvocation.args;
      const structure = await analyzeFolderStructure(path, 0, maxDepth);

      setIsValidated(true);

      // Prepare analysis data in the format expected by generateSettings
      const analysisData = {
        structure,
        stats: {
          totalFiles: structure.files.length,
          fileTypes: structure.files.reduce((acc, file) => {
            const ext = file.name.split(".").pop() || "no-extension";
            acc[ext] = (acc[ext] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          folderCount: structure.subfolders.length,
          maxDepth: maxDepth,
        },
      };

      handleAddResult(JSON.stringify(analysisData));
    } catch (error) {
      console.error("Analysis error:", error);
      handleAddResult(
        JSON.stringify({
          success: false,
          error: error.message || "An error occurred during analysis",
        })
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-[--text-muted]">
        This will analyze your vault structure to suggest optimal organization
        and settings. The analysis will:
        <ul className="list-disc ml-4 mt-2 space-y-1">
          <li>Scan your folder hierarchy</li>
          <li>Analyze file naming patterns</li>
          <li>Identify common groupings</li>
          <li>Generate recommended settings</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`
                px-4 py-2 
                ${
                  isAnalyzing
                    ? "bg-[--background-modifier-border] cursor-not-allowed"
                    : "bg-[--interactive-accent] hover:bg-[--interactive-accent-hover]"
                }
                text-[--text-on-accent]
                transition-colors
              `}
        >
          {isAnalyzing ? "Analyzing..." : "Start Analysis"}
        </button>
      </div>
    </div>
  );
}
