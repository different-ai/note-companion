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
      <div className="font-mono text-xs leading-relaxed">
        {diff.map((line, index) => (
          <div 
            key={index}
            className={`py-1 px-2 flex items-start ${
              line.added 
                ? "bg-[--background-modifier-success] bg-opacity-10" 
                : line.removed 
                ? "bg-[--background-modifier-error] bg-opacity-10"
                : "hover:bg-[--background-modifier-hover]"
            } ${line.removed ? "opacity-70" : ""}`}
          >
            <span className="select-none mr-3 text-[--text-muted] w-4 inline-block">
              {line.added ? "+" : line.removed ? "-" : " "}
            </span>
            <span className={line.removed ? "line-through" : ""}>
              {line.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (modifySuccess === null && !pendingChanges) {
    return (
      <div className="p-4 space-y-2 bg-[--background-secondary] animate-pulse">
        <div className="h-4 w-3/4 bg-[--background-modifier-border] rounded"></div>
        <div className="h-4 w-1/2 bg-[--background-modifier-border] rounded"></div>
      </div>
    );
  }

  if (pendingChanges && !modifySuccess) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-[--text-normal]">
            Review Changes
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDiscardChanges}
              className="px-3 py-1 text-sm border border-[--background-modifier-border] hover:bg-[--background-modifier-hover] text-[--text-muted]"
              disabled={isApplying}
            >
              Discard
            </button>
            <button
              onClick={handleApplyChanges}
              disabled={isApplying}
              className="px-3 py-1 text-sm bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] text-[--text-on-accent] flex items-center space-x-1"
            >
              {isApplying ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Apply Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {explanation && (
          <div className="p-3 bg-[--background-primary] border border-[--background-modifier-border]">
            <div className="text-xs font-medium text-[--text-muted] uppercase tracking-wide mb-1">
              Summary of Changes
            </div>
            <div className="text-sm text-[--text-normal]">
              {explanation}
            </div>
          </div>
        )}

        <div className="border border-[--background-modifier-border] overflow-hidden">
          <div className="bg-[--background-primary] border-b border-[--background-modifier-border] px-3 py-2">
            <div className="text-xs font-medium text-[--text-muted] uppercase tracking-wide">
              Detailed Changes
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto bg-[--background-primary]">
            {renderDiff()}
          </div>
        </div>
      </div>
    );
  }

  if (modifySuccess) {
    return (
      <div className="p-4 space-y-3 bg-[--background-primary] border border-[--background-modifier-border]">
        <div className="flex items-center text-[--text-success] space-x-2">
          <span className="text-lg">✓</span>
          <span className="font-medium">Changes Applied Successfully</span>
        </div>
        {explanation && (
          <div className="text-sm text-[--text-muted]">
            {explanation}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 bg-[--background-primary] border border-[--background-modifier-error]">
      <div className="flex items-center text-[--text-error] space-x-2">
        <span className="text-lg">⚠</span>
        <span className="font-medium">Failed to Apply Changes</span>
      </div>
      {explanation && (
        <div className="text-sm text-[--text-muted]">
          <strong>Attempted Changes:</strong> {explanation}
        </div>
      )}
    </div>
  );
} 