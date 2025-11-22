import React, { useState } from "react";
import { TFile } from "obsidian";
import { ToolHandlerProps } from "./types";
import { usePlugin } from "../../provider";

export function RenameFilesHandler({ toolInvocation, handleAddResult, app }: ToolHandlerProps) {
  const plugin = usePlugin();
  const [isDone, setIsDone] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [filesToRename, setFilesToRename] = useState<Array<{oldPath: string; newName: string}>>([]);

  React.useEffect(() => {
    if (!isDone && !filesToRename.length) {
      const { files } = toolInvocation.args;
      setFilesToRename(files);
    }
  }, [toolInvocation.args, isDone]);

  const handleRename = async () => {
    const { files } = toolInvocation.args;
    const renameResults: string[] = [];

    for (const fileData of files) {
      try {
        const existingFile = plugin.app.vault.getAbstractFileByPath(fileData.oldPath);
        if (existingFile && existingFile instanceof TFile) {
          const newPath = existingFile.path.replace(existingFile.name, fileData.newName);
          await plugin.app.fileManager.renameFile(existingFile, newPath);
          renameResults.push(`✅ Renamed: ${existingFile.path} → ${newPath}`);
        } else {
          renameResults.push(`❌ Could not find file: ${fileData.oldPath}`);
        }
      } catch (error) {
        renameResults.push(`❌ Error: ${error.message}`);
      }
    }

    setResults(renameResults);
    setIsDone(true);
    handleAddResult(JSON.stringify({ success: true, results: renameResults }));
  };

  return (
    <div className="flex flex-col space-y-4 p-4 border border-[--background-modifier-border]">
      <div className="text-[--text-normal]">
        {toolInvocation.args.message || "Ready to rename files"}
      </div>

      {!isDone && filesToRename.length > 0 && (
        <div className="text-sm text-[--text-muted]">
          Found {filesToRename.length} files to rename:
          <ul className="list-disc ml-4 mt-1">
            {filesToRename.slice(0, 5).map((file, i) => (
              <li key={i}>{file.oldPath} → {file.newName}</li>
            ))}
            {filesToRename.length > 5 && (
              <li>...and {filesToRename.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <div className="text-sm space-y-1">
          {results.map((result, i) => (
            <div 
              key={i}
              className={`${
                result.startsWith("✅") 
                  ? "text-[--text-success]" 
                  : "text-[--text-error]"
              }`}
            >
              {result}
            </div>
          ))}
        </div>
      )}

      {!isDone && (
        <div className="flex space-x-2">
          <button
            onClick={handleRename}
            className="px-4 py-2 bg-[--interactive-accent] text-[--text-on-accent] hover:bg-[--interactive-accent-hover]"
          >
            Rename {filesToRename.length} Files
          </button>
          <button
            onClick={() =>
              handleAddResult(
                JSON.stringify({
                  success: false,
                  message: "User cancelled file renaming",
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
