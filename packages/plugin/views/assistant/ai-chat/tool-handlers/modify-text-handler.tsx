import React, { useRef, useState } from "react";
import { App, TFile } from "obsidian";
import { logger } from "../../../../services/logger";
import { usePlugin } from "../../provider";

interface ModifyTextHandlerProps {
  toolInvocation: any;
  handleAddResult: (result: string) => void;
  app: App;
}

interface DiffLine {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function ModifyTextHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ModifyTextHandlerProps) {
  const hasFetchedRef = useRef(false);
  const [modifySuccess, setModifySuccess] = useState<boolean | null>(null);
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    content: string;
    targetFile: TFile;
    editor?: any;
  } | null>(null);
  const plugin = usePlugin();

  React.useEffect(() => {
    const fetchModifications = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { content, path, instructions } = toolInvocation.args;
        try {
          let targetFile: TFile;
          let originalContent: string;
          
          if (path) {
            targetFile = app.vault.getAbstractFileByPath(path) as TFile;
            if (!targetFile) {
              throw new Error(`File not found at path: ${path}`);
            }
          } else {
            targetFile = app.workspace.getActiveFile();
            if (!targetFile) {
              throw new Error("No active file found");
            }
          }
          
          originalContent = await app.vault.read(targetFile);
          
          const response = await fetch(`${plugin.getServerUrl()}/api/modify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${plugin.getApiKey()}`,
            },
            body: JSON.stringify({
              content,
              originalContent,
              instructions
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to generate modification");
          }

          const data = await response.json();
          setDiff(data.diff);
          setExplanation(data.explanation);
          
          const editor = app.workspace.activeEditor?.editor;
          setPendingChanges({
            content: data.content,
            targetFile,
            editor
          });
          
        } catch (error) {
          logger.error("Error modifying text in document:", error);
          handleAddResult(`Error: ${error.message}`);
          setModifySuccess(false);
        }
      }
    };

    fetchModifications();
  }, [toolInvocation, handleAddResult, app]);

  const handleApplyChanges = async () => {
    if (!pendingChanges) return;
    
    setIsApplying(true);
    try {
      const { content, targetFile, editor } = pendingChanges;
      
      if (editor) {
        const selection = editor.getSelection();
        if (selection) {
          editor.replaceSelection(content);
        } else {
          editor.setValue(content);
        }
      } else {
        await app.vault.modify(targetFile, content);
      }
      
      logger.info(`Successfully modified text in document: ${targetFile.path}`);
      handleAddResult(`Successfully modified text in document${targetFile.path ? `: ${targetFile.path}` : ""}`);
      setModifySuccess(true);
    } catch (error) {
      logger.error("Error applying modifications:", error);
      handleAddResult(`Error applying changes: ${error.message}`);
      setModifySuccess(false);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDiscardChanges = () => {
    handleAddResult("Changes discarded by user");
    setModifySuccess(false);
    setPendingChanges(null);
  };

  const renderDiff = () => {
    return (
      <div className="font-mono text-xs leading-snug">
        {diff.map((line, index) => {
          // Skip empty unchanged lines for better readability
          if (!line.added && !line.removed && !line.value.trim()) {
            return null;
          }

          // Determine background color
          let bgColor = '';
          if (line.added) {
            bgColor = 'rgba(var(--color-green-rgb, 0, 255, 0), 0.15)';
          } else if (line.removed) {
            bgColor = 'rgba(var(--color-red-rgb, 255, 0, 0), 0.15)';
          }

          return (
            <div 
              key={index}
              style={bgColor ? { backgroundColor: bgColor } : {}}
              className={`py-0.5 px-2 flex items-start border-l-2 ${
                line.added 
                  ? "border-[--text-success]" 
                  : line.removed 
                  ? "border-[--text-error]" 
                  : "border-transparent"
              }`}
            >
              <span className={`select-none mr-2 w-4 flex-shrink-0 font-bold ${
                line.added ? "text-[--text-success]" : line.removed ? "text-[--text-error]" : "text-[--text-faint]"
              }`}>
                {line.added ? "+" : line.removed ? "−" : ""}
              </span>
              <span className={`flex-1 whitespace-pre-wrap break-words ${
                line.removed ? "line-through opacity-75 text-[--text-error]" : ""
              } ${
                line.added ? "font-medium text-[--text-success]" : ""
              } ${
                !line.added && !line.removed ? "text-[--text-muted]" : ""
              }`}>
                {line.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (modifySuccess === null && !pendingChanges) {
    return (
      <div className="p-2 text-sm text-[--text-muted]">
        Analyzing changes...
      </div>
    );
  }

  if (pendingChanges && !modifySuccess) {
    // Calculate diff stats
    const addedCount = diff.filter(d => d.added).length;
    const removedCount = diff.filter(d => d.removed).length;
    const unchangedCount = diff.filter(d => !d.added && !d.removed).length;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-[--background-modifier-border] pb-2">
          <div className="text-xs font-semibold text-[--text-muted] uppercase">
            Review Changes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardChanges}
              className="px-2 py-1 text-xs border border-[--background-modifier-border] hover:bg-[--background-modifier-hover] text-[--text-muted]"
              disabled={isApplying}
            >
              Discard
            </button>
            <button
              onClick={handleApplyChanges}
              disabled={isApplying}
              className="px-2 py-1 text-xs bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] text-[--text-on-accent] flex items-center gap-1"
            >
              {isApplying ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Apply</span>
                </>
              )}
            </button>
          </div>
        </div>

        {explanation && (
          <div className="p-2 border-b border-[--background-modifier-border]">
            <div className="text-xs font-semibold text-[--text-muted] uppercase mb-1">
              Summary
            </div>
            <div className="text-xs text-[--text-normal]">
              {explanation}
            </div>
          </div>
        )}

        <div className="border border-[--background-modifier-border]">
          <div className="border-b border-[--background-modifier-border] px-2 py-1 flex items-center justify-between">
            <div className="text-xs font-semibold text-[--text-muted] uppercase">
              Diff
            </div>
            <div className="flex items-center gap-3 text-xs">
              {removedCount > 0 && (
                <span className="text-[--text-error] flex items-center gap-1">
                  <span>−</span>
                  <span>{removedCount} removed</span>
                </span>
              )}
              {addedCount > 0 && (
                <span className="text-[--text-success] flex items-center gap-1">
                  <span>+</span>
                  <span>{addedCount} added</span>
                </span>
              )}
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {renderDiff()}
          </div>
        </div>
      </div>
    );
  }

  if (modifySuccess) {
    return (
      <div className="p-3 space-y-2 border-b border-[--background-modifier-border]">
        <div className="flex items-center text-[--text-success] space-x-2">
          <span className="text-base">✓</span>
          <span className="text-sm font-medium">Changes Applied Successfully</span>
        </div>
        {explanation && (
          <div className="text-xs text-[--text-muted]">
            {explanation}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 border-b border-[--background-modifier-border]">
      <div className="flex items-center text-[--text-error] space-x-2">
        <span className="text-base">⚠</span>
        <span className="text-sm font-medium">Failed to Apply Changes</span>
      </div>
      {explanation && (
        <div className="text-xs text-[--text-muted]">
          <strong>Attempted Changes:</strong> {explanation}
        </div>
      )}
    </div>
  );
} 