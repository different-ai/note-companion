import React, { useRef, useState } from "react";
import { App, TFile, Notice } from "obsidian";
import { ToolInvocation } from "ai";

interface ExportToFormatHandlerProps {
  toolInvocation: ToolInvocation;
  handleAddResult: (result: string) => void;
  app: App;
}

export function ExportToFormatHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ExportToFormatHandlerProps) {
  const hasFetchedRef = useRef(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [validFiles, setValidFiles] = useState<TFile[]>([]);
  const [invalidPaths, setInvalidPaths] = useState<string[]>([]);

  React.useEffect(() => {
    const validateFiles = () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { filePaths } = toolInvocation.args;

        const valid: TFile[] = [];
        const invalid: string[] = [];

        filePaths.forEach((path: string) => {
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

  const stripFrontmatter = (content: string): string => {
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    return content.replace(frontmatterRegex, "");
  };

  const handleConfirmExport = async () => {
    const {
      format,
      outputFolder = "Exports",
      includeMetadata = false,
    } = toolInvocation.args;

    try {
      // Ensure export folder exists
      const folderExists = app.vault.getAbstractFileByPath(outputFolder);
      if (!folderExists) {
        await app.vault.createFolder(outputFolder);
      }

      let exportedCount = 0;
      const exportedFiles: string[] = [];
      const errors: string[] = [];

      for (const file of validFiles) {
        try {
          let content = await app.vault.read(file);

          // Remove frontmatter if requested
          if (!includeMetadata) {
            content = stripFrontmatter(content);
          }

          const baseName = file.basename;
          let exportedContent = content;
          let extension = format;

          // Format-specific processing
          if (format === "html") {
            // Basic markdown to HTML conversion
            exportedContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${baseName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
    code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; }
  </style>
</head>
<body>
${content.replace(/\n/g, "<br>\n")}
</body>
</html>`;
          } else if (format === "txt") {
            // Plain text - strip markdown formatting
            exportedContent = content
              .replace(/#{1,6}\s/g, "") // Remove heading markers
              .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
              .replace(/\*(.+?)\*/g, "$1") // Remove italic
              .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links, keep text
              .replace(/`(.+?)`/g, "$1"); // Remove inline code
          } else if (format === "pdf") {
            // PDF export is not directly supported in Obsidian plugin
            // Would need external library or API
            errors.push(
              `${file.path}: PDF export requires external converter (not yet implemented)`
            );
            continue;
          }

          // Create export file
          const exportPath = `${outputFolder}/${baseName}.${extension}`;
          const existingExport = app.vault.getAbstractFileByPath(exportPath);

          if (existingExport) {
            await app.vault.modify(existingExport as TFile, exportedContent);
          } else {
            await app.vault.create(exportPath, exportedContent);
          }

          exportedFiles.push(exportPath);
          exportedCount++;
        } catch (error) {
          errors.push(`${file.path}: ${error.message}`);
        }
      }

      setIsDone(true);

      const message = `Exported ${exportedCount} file(s) to ${format.toUpperCase()}`;

      new Notice(message);

      handleAddResult(
        JSON.stringify({
          success: true,
          exportedCount,
          format,
          outputFolder,
          exportedFiles,
          message,
          errors: errors.length > 0 ? errors : undefined,
        })
      );
    } catch (error) {
      setIsDone(true);
      new Notice(`Export failed: ${error.message}`);
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
        message: "User cancelled export",
      })
    );
  };

  const {
    format,
    outputFolder = "Exports",
    includeMetadata = false,
    message: reason,
  } = toolInvocation.args;
  const isComplete = "result" in toolInvocation;

  if (isComplete || isDone) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-success] text-xs">
          {isDone && !isConfirmed ? "✗ Export cancelled" : "✓ Export complete"}
        </div>
      </div>
    );
  }

  if (validFiles.length === 0) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-error] text-xs">
          ✗ No valid files to export.
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 border border-[--background-modifier-border]">
      <div className="flex items-start gap-2">
        <span className="text-[--text-accent] text-lg">📤</span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[--text-normal] mb-1">
            Confirm Export
          </div>
          <div className="text-xs text-[--text-muted] mb-2">{reason}</div>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold text-[--text-muted] uppercase">
          Export Settings
        </div>
        <div className="p-2 bg-[--background-secondary] space-y-1">
          <div className="text-[--text-normal]">
            <strong>Format:</strong> {format.toUpperCase()}
          </div>
          <div className="text-[--text-normal]">
            <strong>Output:</strong> {outputFolder}/
          </div>
          <div className="text-[--text-normal]">
            <strong>Metadata:</strong> {includeMetadata ? "Included" : "Excluded"}
          </div>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold text-[--text-muted] uppercase">
          Files to Export ({validFiles.length})
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

      {invalidPaths.length > 0 && (
        <div className="text-xs text-[--text-error]">
          ⚠ {invalidPaths.length} invalid path(s) will be skipped
        </div>
      )}

      {format === "pdf" && (
        <div className="p-2 bg-[--background-secondary] text-xs text-[--text-warning]">
          <strong>⚠ Note:</strong> PDF export is not yet fully implemented
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
            handleConfirmExport();
          }}
          className="flex-1 px-3 py-1.5 text-xs bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] text-white"
        >
          Export {validFiles.length} File{validFiles.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
