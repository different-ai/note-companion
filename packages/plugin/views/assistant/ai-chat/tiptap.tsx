import { useEditor, EditorContent, Editor, Range } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React, { useEffect, useCallback } from "react";
import { Mention } from "@tiptap/extension-mention";
import suggestion from "./suggestion";
import {
  addFileContext,
  addTagContext,
  addFolderContext,
} from "./use-context-items";
import { useVaultItems } from "./use-vault-items";
import { usePlugin } from "../provider";

interface TiptapProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

interface MentionNodeAttrs {
  id: string;
  label: string;
  title: string;
  content: string;
  type: "file" | "tag" | "folder";
  path?: string;
}

const Tiptap: React.FC<TiptapProps> = ({ value, onChange, onKeyDown }) => {
  const plugin = usePlugin();
  const { files, folders, tags, loadFileContent } = useVaultItems();

  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      const content = editor.getText();
      onChange(content);
    },
    [onChange]
  );

  const handleMentionCommand = async ({
    editor,
    range,
    props,
  }: {
    editor: Editor;
    range: Range;
    props: MentionNodeAttrs;
  }) => {
    // Load file content if it's a file mention
    if (props.type === "file") {
      const content = await loadFileContent(props.path);
      props.content = content || "";
    }

    // Insert mention in editor
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        {
          type: "mention",
          attrs: props,
        },
        {
          type: "text",
          text: " ",
        },
      ])
      .run();

    // Add to context based on type
    switch (props.type) {
      case "file":
        addFileContext({
          path: props.path,
          title: props.title,
          content: props.content,
          });
        break;

      case "tag":
        addTagContext(props.title, plugin.app);
        break;

      case "folder":
        addFolderContext(props.path, plugin.app);
        break;
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class:
            "bg-[--background-modifier-active-hover] text-[--text-accent]  px-1 py-0.5",
        },
        suggestion: {
          ...suggestion,
          decorationClass:
            "bg-[--background-modifier-active-hover] text-[--text-accent]  px-1 py-0.5",
          items: ({ query, editor }) => suggestion.items({ query, editor }),
          command: handleMentionCommand,
        },
      }),
    ],
    content: value,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
      },
    },
  });

  // Update editor storage with available mentions
  useEffect(() => {
    if (editor) {
      editor.storage.mention = {
        files,
        folders,
        tags,
      };
    }
  }, [editor, files, folders, tags]);

  // Sync editor content with value prop
  useEffect(() => {
    if (editor && editor.getText() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="tiptap-editor" onKeyDown={onKeyDown}>
      <EditorContent editor={editor} />
    </div>
  );
};

export default Tiptap;
