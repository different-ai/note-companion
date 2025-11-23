import React, { useRef } from "react";
import { MarkdownView } from "obsidian";
import { ToolHandlerProps } from "./types";

interface ReplaceSelectionArgs {
  newText: string;
  message: string;
}

export function ReplaceSelectionHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);

  React.useEffect(() => {
    const execute = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const args = toolInvocation.args as ReplaceSelectionArgs;

        try {
          // Get the active markdown view
          const view = app.workspace.getActiveViewOfType(MarkdownView);

          if (!view || !view.editor) {
            handleAddResult(
              JSON.stringify({
                success: false,
                message: "No active editor found",
              })
            );
            return;
          }

          const editor = view.editor;
          const selection = editor.getSelection();

          if (!selection || selection.length === 0) {
            handleAddResult(
              JSON.stringify({
                success: false,
                message: "No text selected. Please select text to replace.",
              })
            );
            return;
          }

          // Replace the selection with new text
          editor.replaceSelection(args.newText);

          handleAddResult(
            JSON.stringify({
              success: true,
              message: `Successfully replaced selection: ${args.message}`,
              oldText: selection,
              newText: args.newText,
            })
          );
        } catch (error) {
          handleAddResult(
            JSON.stringify({
              success: false,
              message: `Error replacing selection: ${(error as Error).message}`,
            })
          );
        }
      }
    };

    execute();
  }, [toolInvocation, handleAddResult, app]);

  const args = toolInvocation.args as ReplaceSelectionArgs;
  const isComplete = "result" in toolInvocation;

  return (
    <div className="text-sm text-[--text-muted]">
      {!isComplete ? (
        <>Replacing selection: {args.message}</>
      ) : (
        <>Selection replaced</>
      )}
    </div>
  );
}
