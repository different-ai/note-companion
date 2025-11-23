import { useEffect, useState } from "react";
import { App, MarkdownView, EditorPosition, EditorSelection } from "obsidian";

export interface EditorSelectionContext {
  selectedText: string;
  cursorPosition: EditorPosition | null;
  currentLine: string;
  lineNumber: number;
  hasSelection: boolean;
  filePath: string | null;
  fileName: string | null;
  selection: EditorSelection | null;
}

const EMPTY_CONTEXT: EditorSelectionContext = {
  selectedText: "",
  cursorPosition: null,
  currentLine: "",
  lineNumber: 0,
  hasSelection: false,
  filePath: null,
  fileName: null,
  selection: null,
};

/**
 * Hook to track the current editor selection and context
 * 
 * This hook listens to editor changes and keeps track of:
 * - Selected text
 * - Cursor position
 * - Current line content
 * - File information
 * 
 * This enables the AI to understand what "this" refers to when users say:
 * - "make this more concise"
 * - "fix grammar in this"
 * - "rewrite this paragraph"
 */
export function useEditorSelection(app: App): EditorSelectionContext {
  const [context, setContext] = useState<EditorSelectionContext>(EMPTY_CONTEXT);

  useEffect(() => {
    const updateContext = () => {
      const view = app.workspace.getActiveViewOfType(MarkdownView);
      
      if (!view || !view.editor) {
        setContext(EMPTY_CONTEXT);
        return;
      }

      const editor = view.editor;
      const file = view.file;

      try {
        // Get selection
        const selectedText = editor.getSelection();
        const hasSelection = selectedText.length > 0;

        // Get cursor position
        const cursorPosition = editor.getCursor();
        const lineNumber = cursorPosition.line;
        const currentLine = editor.getLine(lineNumber);

        // Get selection range
        const selection = hasSelection
          ? {
              anchor: editor.getCursor("from"),
              head: editor.getCursor("to"),
            }
          : null;

        setContext({
          selectedText,
          cursorPosition,
          currentLine,
          lineNumber,
          hasSelection,
          filePath: file?.path || null,
          fileName: file?.basename || null,
          selection,
        });
      } catch (error) {
        console.error("Error getting editor context:", error);
        setContext(EMPTY_CONTEXT);
      }
    };

    // Update immediately on mount
    updateContext();

    // Listen to editor changes
    const editorChangeRef = app.workspace.on("editor-change", () => {
      updateContext();
    });

    // Listen to active leaf changes (when switching files/panes)
    const activeLeafChangeRef = app.workspace.on("active-leaf-change", () => {
      updateContext();
    });

    // Listen to file opens
    const fileOpenRef = app.workspace.on("file-open", () => {
      updateContext();
    });

    // Cleanup
    return () => {
      app.workspace.offref(editorChangeRef);
      app.workspace.offref(activeLeafChangeRef);
      app.workspace.offref(fileOpenRef);
    };
  }, [app]);

  return context;
}

/**
 * Format the editor context for inclusion in AI chat messages
 * This creates a structured representation that the AI can understand
 */
export function formatEditorContextForAI(context: EditorSelectionContext): string {
  if (!context.filePath) {
    return "";
  }

  const parts: string[] = [];

  // Add file context
  parts.push(`<editor_context>`);
  parts.push(`<file>${context.fileName || "Untitled"}</file>`);
  parts.push(`<path>${context.filePath}</path>`);

  // Add selection or cursor context
  if (context.hasSelection && context.selectedText) {
    const lineRange =
      context.selection?.anchor && context.selection?.head
        ? `lines ${context.selection.anchor.line + 1}-${context.selection.head.line + 1}`
        : `line ${context.lineNumber + 1}`;

    parts.push(`<selection>`);
    parts.push(`<range>${lineRange}</range>`);
    parts.push(`<text>`);
    parts.push(context.selectedText);
    parts.push(`</text>`);
    parts.push(`</selection>`);
  } else if (context.currentLine) {
    parts.push(`<cursor>`);
    parts.push(`<line_number>${context.lineNumber + 1}</line_number>`);
    parts.push(`<line_content>${context.currentLine}</line_content>`);
    parts.push(`</cursor>`);
  }

  parts.push(`</editor_context>`);

  return parts.join("\n");
}
