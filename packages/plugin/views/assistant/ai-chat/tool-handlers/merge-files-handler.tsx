import React, { useRef, useState } from "react";
import { App, TFile, Notice } from "obsidian";
import { ToolInvocation } from "ai";

interface MergeFilesHandlerProps {
  toolInvocation: ToolInvocation;
  handleAddResult: (result: string) => void;
  app: App;
}

export function MergeFilesHandler({
  toolInvocation,
  handleAddResult,
  app,
}: MergeFilesHandlerProps) {
  const hasFetchedRef = useRef(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [validFiles, setValidFiles] = useState<TFile[]>([]);
  const [invalidPaths, setInvalidPaths] = useState<string[]>([]);

  React.useEffect(() => {
    const validateFiles = () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { sourceFiles } = toolInvocation.args;

        const valid: TFile[] = [];
        const invalid: string[] = [];

        sourceFiles.forEach((path: string) => {
          const file = app.vault.getAbstractFileByPath(path);
          if (file instanceof TFile) {
            valid.push(file);
          } else {
            invalid.push(path);
          }
        });

        setValidFiles(valid);
        setInvalidPaths(invalid);
      }
    };

    validateFiles();
  }, [toolInvocation, app]);

  const handleConfirmMerge = async () => {
    const {
      outputFileName,
      outputFolder = "",
      separator = "\n\n---\n\n",
      deleteSource = false,
    } = toolInvocation.args;

    try {
      // Read all file contents
      const contents: string[] = [];
      for (const file of validFiles) {
        const content = await app.vault.read(file);
        contents.push(content);
      }

      // Merge contents
      const mergedContent = contents.join(separator);

      // Determine output path
      const outputPath = outputFolder
        ? `${outputFolder}/${outputFileName}.md`
        : `${outputFileName}.md`;

      // Create merged file
      const existingFile = app.vault.getAbstractFileByPath(outputPath);
      if (existingFile instanceof TFile) {
        // File exists, ask to overwrite
        const confirmOverwrite = confirm(
          `File "${outputFileName}.md" already exists. Overwrite?`
        );
        if (!confirmOverwrite) {
          setIsDone(true);
          handleAddResult(
            JSON.stringify({
              success: false,
              message: "User cancelled merge (file already exists)",
            })
          );
          return;
        }
        await app.vault.modify(existingFile, mergedContent);
      } else {
        // Create new file
        await app.vault.create(outputPath, mergedContent);
      }

      // Delete source files if requested
      if (deleteSource) {
        for (const file of validFiles) {
          await app.vault.trash(file, false);
        }
      }

      setIsDone(true);

      const message = deleteSource
        ? `Merged ${validFiles.length} files into "${outputFileName}.md" and deleted source files`
        : `Merged ${validFiles.length} files into "${outputFileName}.md"`;

      new Notice(message);

      handleAddResult(
        JSON.stringify({
          success: true,
          mergedFile: outputPath,
          sourceFileCount: validFiles.length,
          deletedSource: deleteSource,
          message,
        })
      );
    } catch (error) {
      setIsDone(true);
      new Notice(`Failed to merge files: ${error.message}`);
      handleAddResult(
        JSON.stringify({
          success: false,
          error: error.message,
        })
      );
    }
  };

  const handleCancel = () => {
    setIsDone(true);
    handleAddResult(
      JSON.stringify({
        success: false,
        message: "User cancelled merge",
      })
    );
  };

  const {
    message: reason,
    outputFileName,
    deleteSource = false,
  } = toolInvocation.args;
  const isComplete = "result" in toolInvocation;

  if (isComplete || isDone) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-success] text-xs">
          {isDone && !isConfirmed ? "✗ Merge cancelled" : "✓ Files merged"}
        </div>
      </div>
    );
  }

  if (validFiles.length === 0 && invalidPaths.length > 0) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-error] text-xs">
          ✗ No valid files to merge. All paths were invalid.
        </div>
      </div>
    );
  }

  if (validFiles.length < 2) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-error] text-xs">
          ✗ Need at least 2 files to merge.
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 border border-[--background-modifier-border]">
      <div className="flex items-start gap-2">
        <span className="text-[--text-accent] text-lg">⚡</span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[--text-normal] mb-1">
            Confirm Merge
          </div>
          <div className="text-xs text-[--text-muted] mb-2">{reason}</div>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold text-[--text-muted] uppercase">
          Files to merge ({validFiles.length})
        </div>
        {validFiles.slice(0, 5).map((file) => (
          <div key={file.path} className="text-[--text-normal] pl-2">
            • {file.basename}
          </div>
        ))}
        {validFiles.length > 5 && (
          <div className="text-[--text-faint] pl-2">
            ...and {validFiles.length - 5} more
          </div>
        )}
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold text-[--text-muted] uppercase">
          Output file
        </div>
        <div className="text-[--text-normal] pl-2">📄 {outputFileName}.md</div>
      </div>

      {invalidPaths.length > 0 && (
        <div className="text-xs text-[--text-error]">
          ⚠ {invalidPaths.length} invalid path(s) will be skipped
        </div>
      )}

      {deleteSource && (
        <div className="p-2 bg-[--background-secondary] text-xs text-[--text-warning]">
          <strong>⚠ Warning:</strong> Source files will be moved to trash after
          merge
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          className="flex-1 px-3 py-1.5 text-xs border border-[--background-modifier-border] hover:bg-[--background-modifier-hover] text-[--text-normal]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setIsConfirmed(true);
            handleConfirmMerge();
          }}
          className="flex-1 px-3 py-1.5 text-xs bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] text-white"
        >
          Merge {validFiles.length} Files
        </button>
      </div>
    </div>
  );
}
