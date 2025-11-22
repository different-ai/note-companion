import React, { useState } from "react";
import { TFile } from "obsidian";
import { usePlugin } from "../../provider";
import { ToolHandlerProps } from "./types";

interface FilePattern {
  namePattern?: string;
  extension?: string;
}

interface MoveOperation {
  sourcePath: string;
  destinationPath: string;
  pattern?: FilePattern;
}

export function MoveFilesHandler({
  toolInvocation,
  handleAddResult,
}: ToolHandlerProps) {
  const plugin = usePlugin();
  const [isValidated, setIsValidated] = useState(false);
  const [moveResults, setMoveResults] = useState<string[]>([]);
  const [filesToMove, setFilesToMove] = useState<TFile[]>([]);

  // Simplified pattern matching without isRoot
  const matchesPattern = (file: TFile, pattern?: FilePattern): boolean => {
    if (!pattern) return true;

    const { namePattern, extension } = pattern;

    // Check file name pattern
    if (namePattern) {
      const regex = new RegExp(namePattern.replace("*", ".*"));
      if (!regex.test(file.basename)) {
        return false;
      }
    }

    // Check extension
    if (extension && !file.extension.toLowerCase().includes(extension.toLowerCase())) {
      return false;
    }

    return true;
  };

  // Simplified file matching using sourcePath
  const getMatchingFiles = (moveOp: MoveOperation): TFile[] => {
    const allFiles = plugin.app.vault.getMarkdownFiles();
    
    return allFiles.filter(file => {
      // For root path, only match files directly in root
      if (moveOp.sourcePath === "/") {
        return !file.path.includes("/") && matchesPattern(file, moveOp.pattern);
      }
      
      // For specific source paths
      return file.path.startsWith(moveOp.sourcePath) && matchesPattern(file, moveOp.pattern);
    });
  };

  React.useEffect(() => {
    if (!isValidated && !filesToMove.length) {
      const { moves } = toolInvocation.args;
      const matchedFiles = moves.flatMap(move => getMatchingFiles(move));
      setFilesToMove(matchedFiles);
    }
  }, [toolInvocation.args, isValidated]);

  const handleMoveFiles = async () => {
    const { moves } = toolInvocation.args;
    const results: string[] = [];

    for (const move of moves) {
      try {
        // Get matching files for this move operation
        const matchingFiles = getMatchingFiles(move);

        // Create destination folder if it doesn't exist
        await plugin.app.vault.createFolder(move.destinationPath).catch(() => {});

        // Move each matching file
        for (const file of matchingFiles) {
          const newPath = `${move.destinationPath}/${file.name}`;
          await plugin.app.fileManager.renameFile(file, newPath);
          results.push(`✅ Moved: ${file.path} → ${newPath}`);
        }

        if (matchingFiles.length === 0) {
          results.push(`ℹ️ No files found matching criteria for ${move.sourcePath}`);
        }
      } catch (error) {
        results.push(`❌ Error: ${error.message}`);
      }
    }

    setMoveResults(results);
    setIsValidated(true);
    handleAddResult(JSON.stringify({ success: true, results }));
  };

  return (
    <div className="flex flex-col space-y-4 p-4 border border-[--background-modifier-border]">
      <div className="text-[--text-normal]">
        {toolInvocation.args.message || "Ready to move files"}
      </div>

      {!isValidated && filesToMove.length > 0 && (
        <div className="text-sm text-[--text-muted]">
          Found {filesToMove.length} files to move:
          <ul className="list-disc ml-4 mt-1">
            {filesToMove.slice(0, 5).map((file, i) => (
              <li key={i}>{file.path}</li>
            ))}
            {filesToMove.length > 5 && (
              <li>...and {filesToMove.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {moveResults.length > 0 && (
        <div className="text-sm space-y-1">
          {moveResults.map((result, i) => (
            <div 
              key={i}
              className={`${
                result.startsWith("✅") 
                  ? "text-[--text-success]" 
                  : result.startsWith("ℹ️")
                  ? "text-[--text-muted]"
                  : "text-[--text-error]"
              }`}
            >
              {result}
            </div>
          ))}
        </div>
      )}

      {!isValidated && (
        <div className="flex space-x-2">
          <button
            onClick={handleMoveFiles}
            className="px-4 py-2 bg-[--interactive-accent] text-[--text-on-accent] hover:bg-[--interactive-accent-hover]"
          >
            Move {filesToMove.length} Files
          </button>
          <button
            onClick={() =>
              handleAddResult(
                JSON.stringify({
                  success: false,
                  message: "User cancelled file movement",
                })
              )
            }
            className="px-4 py-2 bg-[--background-modifier-border] text-[--text-normal] hover:bg-[--background-modifier-border-hover]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
} 