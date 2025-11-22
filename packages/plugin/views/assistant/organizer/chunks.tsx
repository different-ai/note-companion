import * as React from "react";
import { TFile } from "obsidian";
import FileOrganizer from "../../../index";
import { logger } from "../../../services/logger";
import { MarkdownRenderer } from "obsidian";

interface DocumentChunksProps {
  plugin: FileOrganizer;
  activeFile: TFile;
}

interface DocumentChunksProps {
  plugin: FileOrganizer;
  activeFile: TFile;
  refreshKey?: number;
}

export const AtomicNotes: React.FC<DocumentChunksProps> = ({ plugin, activeFile, refreshKey }) => {
  const [concepts, setConcepts] = React.useState<string[]>([]);
  const [chunks, setChunks] = React.useState<{ concept: string; content: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setConcepts([]);
    setChunks([]);
  }, [activeFile, refreshKey]);

  const parseDocument = React.useCallback(async () => {
    setLoading(true);
    try {
      const content = await plugin.app.vault.read(activeFile);
      const result = await plugin.identifyConceptsAndFetchChunks(content);
      setConcepts(result.map(c => c.name));
      setChunks(result.map(c => ({ concept: c.name, content: c.chunk })));
    } catch (error) {
      logger.error("Error parsing document:", error);
    } finally {
      setLoading(false);
    }
  }, [activeFile, plugin]);

  const createFileInSameFolder = async (title: string, chunkContent: string) => {
    try {
      const folderPath = activeFile.parent?.path || "";
      const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, "-");
      const newFileName = `${sanitizedTitle}.md`;
      const fullPath = `${folderPath}/${newFileName}`;

      // Add link to parent note at the top of the content
      const parentLink = `> \n\n Source: [[${activeFile.basename}]]`;
      const contentWithLink = chunkContent + parentLink;

      // Create the new file with the markdown content
      await plugin.app.vault.create(fullPath, contentWithLink);
    } catch (error) {
      logger.error("Error creating file in folder:", error);
    }
  };

  // Render markdown content
  const renderMarkdown = React.useCallback(async (content: string, containerEl: HTMLElement) => {
    if (!content) return;
    
    try {
      await MarkdownRenderer.renderMarkdown(
        content,
        containerEl,
        activeFile.path,
        plugin
      );
    } catch (error) {
      logger.error("Error rendering markdown:", error);
      containerEl.textContent = content; // Fallback to plain text
    }
  }, [activeFile, plugin]);

  // Use effect to render markdown after component updates
  React.useEffect(() => {
    const containers = document.querySelectorAll('.chunk-markdown-content');
    containers.forEach((container) => {
      const content = container.getAttribute('data-content');
      if (content) {
        renderMarkdown(content, container as HTMLElement);
      }
    });
  }, [chunks, renderMarkdown]);

  const renderChunk = (chunk: { concept: string; content: string }, index: number) => (
    <div key={index} className="chunk-container p-4 border mb-2">
      <div 
        className="chunk-markdown-content mb-3"
        data-content={chunk.content}
      />
      <button
        className="bg-accent text-accent-foreground px-2 py-1"
        onClick={() => createFileInSameFolder(chunk.concept, chunk.content)}
      >
        Create Note
      </button>
    </div>
  );

  return (
    <div className="document-chunks">
      <button
        onClick={parseDocument}
        disabled={loading}
        className="bg-accent text-accent-foreground px-2 py-1"
      >
        {loading ? "Parsing..." : "Parse Document"}
      </button>
      {concepts.map((concept, index) => (
        <div key={index} className="mb-4">
          <h4 className="text-lg font-medium mb-2">{concept}</h4>
          {chunks
            .filter(chunk => chunk.concept === concept)
            .map((chunk, chunkIndex) => renderChunk(chunk, chunkIndex))}
        </div>
      ))}
    </div>
  );
};
