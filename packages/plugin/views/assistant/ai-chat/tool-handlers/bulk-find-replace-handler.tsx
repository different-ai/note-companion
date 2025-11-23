import React, { useRef, useState } from "react";
import { App, TFile, Notice } from "obsidian";
import { ToolInvocation } from "ai";

interface BulkFindReplaceHandlerProps {
  toolInvocation: ToolInvocation;
  handleAddResult: (result: string) => void;
  app: App;
}

export function BulkFindReplaceHandler({
  toolInvocation,
  handleAddResult,
  app,
}: BulkFindReplaceHandlerProps) {
  const hasFetchedRef = useRef(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [validFiles, setValidFiles] = useState<TFile[]>([]);
  const [invalidPaths, setInvalidPaths] = useState<string[]>([]);
  const [matchCounts, setMatchCounts] = useState<
    Array<{ path: string; count: number }>
  >([]);

  React.useEffect(() => {
    const validateAndPreview = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const {
          filePaths,
          find,
          useRegex = false,
          caseSensitive = true,
        } = toolInvocation.args;

        const valid: TFile[] = [];
        const invalid: string[] = [];
        const counts: Array<{ path: string; count: number }> = [];

        for (const path of filePaths) {
          const file = app.vault.getAbstractFileByPath(path);
          if (file instanceof TFile) {
            valid.push(file);

            // Count matches
            try {
              const content = await app.vault.read(file);
              let matchCount = 0;

              if (useRegex) {
                const flags = caseSensitive ? "g" : "gi";
                const regex = new RegExp(find, flags);
                const matches = content.match(regex);
                matchCount = matches ? matches.length : 0;
              } else {
                const searchText = caseSensitive ? content : content.toLowerCase();
                const findText = caseSensitive ? find : find.toLowerCase();
                let pos = 0;
                while ((pos = searchText.indexOf(findText, pos)) !== -1) {
                  matchCount++;
                  pos += findText.length;
                }
              }

              counts.push({ path: file.path, count: matchCount });
            } catch (error) {
              counts.push({ path: file.path, count: 0 });
            }
          } else {
            invalid.push(path);
          }
        }

        setValidFiles(valid);
        setInvalidPaths(invalid);
        setMatchCounts(counts);
      }
    };

    validateAndPreview();
  }, [toolInvocation, app]);

  const handleConfirmReplace = async () => {
    const {
      find,
      replace,
      useRegex = false,
      caseSensitive = true,
    } = toolInvocation.args;

    let replacedCount = 0;
    let filesModified = 0;
    let totalMatches = 0;
    const errors: string[] = [];

    for (const file of validFiles) {
      try {
        const content = await app.vault.read(file);
        let newContent: string;
        let fileMatches = 0;

        if (useRegex) {
          const flags = caseSensitive ? "g" : "gi";
          const regex = new RegExp(find, flags);
          const matches = content.match(regex);
          fileMatches = matches ? matches.length : 0;
          newContent = content.replace(regex, replace);
        } else {
          const searchText = caseSensitive ? content : content.toLowerCase();
          const findText = caseSensitive ? find : find.toLowerCase();
          
          // Count matches first
          let pos = 0;
          while ((pos = searchText.indexOf(findText, pos)) !== -1) {
            fileMatches++;
            pos += findText.length;
          }

          // Perform replacement
          if (caseSensitive) {
            newContent = content.split(find).join(replace);
          } else {
            // Case-insensitive replacement is complex, use regex
            const regex = new RegExp(
              find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "gi"
            );
            newContent = content.replace(regex, replace);
          }
        }

        if (newContent !== content) {
          await app.vault.modify(file, newContent);
          filesModified++;
          totalMatches += fileMatches;
        }
      } catch (error) {
        errors.push(`${file.path}: ${error.message}`);
      }
    }

    setIsDone(true);

    const message = `Replaced ${totalMatches} occurrence(s) in ${filesModified} file(s)`;

    new Notice(message);

    handleAddResult(
      JSON.stringify({
        success: true,
        filesModified,
        totalMatches,
        message,
        errors: errors.length > 0 ? errors : undefined,
      })
    );
  };

  const handleCancel = () => {
    setIsDone(true);
    handleAddResult(
      JSON.stringify({
        success: false,
        message: "User cancelled find/replace",
      })
    );
  };

  const {
    find,
    replace,
    message: reason,
    useRegex = false,
  } = toolInvocation.args;
  const isComplete = "result" in toolInvocation;

  const totalMatches = matchCounts.reduce((sum, m) => sum + m.count, 0);
  const filesWithMatches = matchCounts.filter((m) => m.count > 0).length;

  if (isComplete || isDone) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-success] text-xs">
          {isDone && !isConfirmed
            ? "✗ Find/Replace cancelled"
            : "✓ Find/Replace complete"}
        </div>
      </div>
    );
  }

  if (validFiles.length === 0) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-error] text-xs">
          ✗ No valid files to search.
        </div>
      </div>
    );
  }

  if (totalMatches === 0) {
    return (
      <div className="text-sm border-b border-[--background-modifier-border] pb-2">
        <div className="text-[--text-muted] text-xs">
          No matches found in {validFiles.length} file(s)
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 border border-[--background-modifier-border]">
      <div className="flex items-start gap-2">
        <span className="text-[--text-accent] text-lg">🔍</span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[--text-normal] mb-1">
            Confirm Find & Replace
          </div>
          <div className="text-xs text-[--text-muted] mb-2">{reason}</div>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold text-[--text-muted] uppercase">
          Operation
        </div>
        <div className="p-2 bg-[--background-secondary] space-y-1">
          <div className="text-[--text-normal]">
            <strong>Find:</strong>{" "}
            <code className="px-1 bg-[--background-primary]">{find}</code>
            {useRegex && <span className="text-[--text-faint] ml-1">(regex)</span>}
          </div>
          <div className="text-[--text-normal]">
            <strong>Replace:</strong>{" "}
            <code className="px-1 bg-[--background-primary]">{replace}</code>
          </div>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold text-[--text-muted] uppercase">
          Impact
        </div>
        <div className="text-[--text-normal] pl-2">
          <strong>{totalMatches}</strong> match(es) in <strong>{filesWithMatches}</strong> file(s)
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold text-[--text-muted] uppercase">
          Files ({filesWithMatches} with matches)
        </div>
        {matchCounts
          .filter((m) => m.count > 0)
          .slice(0, 5)
          .map((item) => (
            <div key={item.path} className="text-[--text-normal] pl-2">
              • {item.path.split("/").pop()} ({item.count} match{item.count !== 1 ? "es" : ""})
            </div>
          ))}
        {filesWithMatches > 5 && (
          <div className="text-[--text-faint] pl-2">
            ...and {filesWithMatches - 5} more file(s)
          </div>
        )}
      </div>

      {invalidPaths.length > 0 && (
        <div className="text-xs text-[--text-error]">
          ⚠ {invalidPaths.length} invalid path(s) will be skipped
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
            handleConfirmReplace();
          }}
          className="flex-1 px-3 py-1.5 text-xs bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] text-white"
        >
          Replace {totalMatches} Match{totalMatches !== 1 ? "es" : ""}
        </button>
      </div>
    </div>
  );
}
