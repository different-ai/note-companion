import * as React from "react";
import { tw } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { FileRecord } from "../../../../inbox/services/record-manager";
import { Notice } from "obsidian";
import FileOrganizer from "../../../../index";

interface UndoButtonProps {
  record: FileRecord;
  plugin: FileOrganizer;
  onUndo?: () => void;
}

export const UndoButton: React.FC<UndoButtonProps> = ({ record, plugin, onUndo }) => {
  const [isUndoing, setIsUndoing] = React.useState(false);

  const canUndo = React.useMemo(() => {
    // Can undo if the file was moved (has newPath) and is completed
    return record.status === "completed" && record.newPath && record.file;
  }, [record]);

  const handleUndo = async () => {
    if (!record.file || !record.newPath) {
      new Notice("Cannot undo: file information missing");
      return;
    }

    setIsUndoing(true);
    try {
      const app = plugin.app;
      const file = record.file;
      
      // Get the inbox path to move file back to
      const inboxPath = plugin.settings.pathToWatch;
      
      // Move file back to inbox
      const originalName = record.originalName.endsWith('.md') 
        ? record.originalName 
        : `${record.originalName}.md`;
      const targetPath = `${inboxPath}/${originalName}`;
      
      // Check if target already exists
      const existing = app.vault.getAbstractFileByPath(targetPath);
      if (existing) {
        new Notice(`Cannot undo: a file already exists at ${targetPath}`);
        setIsUndoing(false);
        return;
      }

      // Move the file back
      await app.fileManager.renameFile(file, targetPath);

      // Reset file metadata (remove frontmatter tags if they were added)
      if (record.tags && record.tags.length > 0) {
        const content = await app.vault.read(file);
        // Simple removal of frontmatter tags
        // This is a basic implementation - you might want to make this more sophisticated
        const lines = content.split('\n');
        const tagPattern = new RegExp(`tags:\\s*\\[${record.tags.map(t => `"${t}"`).join(', ')}\\]`);
        const filtered = lines.filter(line => !tagPattern.test(line));
        await app.vault.modify(file, filtered.join('\n'));
      }

      new Notice(`Undid processing for ${record.originalName}`);
      
      // Call the onUndo callback if provided
      if (onUndo) {
        onUndo();
      }
    } catch (error) {
      console.error("Error undoing file movement:", error);
      new Notice(`Failed to undo: ${error.message}`);
    } finally {
      setIsUndoing(false);
    }
  };

  if (!canUndo) {
    return null;
  }

  return (
    <Button
      onClick={handleUndo}
      disabled={isUndoing}
      size="sm"
      variant="outline"
      className={tw("flex items-center gap-2 text-xs")}
      title="Undo file processing and move back to inbox"
    >
      <Undo2 className={tw(`w-3 h-3 ${isUndoing ? "animate-spin" : ""}`)} />
      {isUndoing ? "Undoing..." : "Undo"}
    </Button>
  );
};
