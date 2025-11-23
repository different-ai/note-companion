import * as React from "react";
import { TFile, WorkspaceLeaf, Notice } from "obsidian";
import FileOrganizer from "../../../index";
import { debounce } from "lodash";

import { SectionHeader } from "../section-header";
import { SimilarTags } from "./tags";
import { AtomicNotes } from "./chunks";
import { RenameSuggestion } from "./titles/box";
import { SimilarFolderBox } from "./folders/box";
import { RefreshButton } from "./components/refresh-button";
import { ClassificationContainer } from "./ai-format/templates";
import { TranscriptionButton } from "./transcript";
import { EmptyState } from "./components/empty-state";
import { logMessage } from "../../../someUtils";
import { LicenseValidator } from "./components/license-validator";
import { VALID_MEDIA_EXTENSIONS } from "../../../constants";
import { logger } from "../../../services/logger";
import { tw } from "../../../lib/utils";

interface AssistantViewProps {
  plugin: FileOrganizer;
  leaf: WorkspaceLeaf;
}

const checkIfIsMediaFile = (file: TFile | null): boolean => {
  if (!file) return false;
  return VALID_MEDIA_EXTENSIONS.includes(file.extension);
};

export const AssistantView: React.FC<AssistantViewProps> = ({
  plugin,
  leaf,
}) => {
  const [activeFile, setActiveFile] = React.useState<TFile | null>(null);
  const [noteContent, setNoteContent] = React.useState<string>("");
  const [refreshKey, setRefreshKey] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [isLicenseValid, setIsLicenseValid] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(true);

  const isMediaFile = React.useMemo(
    () => checkIfIsMediaFile(activeFile),
    [activeFile]
  );

  const isInIgnoredPatterns = React.useMemo(
    () =>
      plugin
        .getAllIgnoredFolders()
        .some(folder => activeFile?.path.startsWith(folder)),
    [activeFile, plugin.getAllIgnoredFolders]
  );

  const updateActiveFile = React.useCallback(async () => {
    logMessage("updating active file");
    // Check if the Assistant view is visible before processing
    const isVisible =
      leaf.view.containerEl.isShown() &&
      !plugin.app.workspace.rightSplit.collapsed;
    if (!isVisible) return;

    try {
      const file = plugin.app.workspace.getActiveFile();
      if (file && !isMediaFile) {
        const content = await plugin.app.vault.read(file);
        setNoteContent(content);
      }
      setActiveFile(file);
    } catch (err) {
      logger.error("Error updating active file:", err);
      setError("Failed to load file content");
    }
  }, [
    plugin.app.workspace,
    plugin.app.vault,
    leaf.view.containerEl,
    plugin.app.workspace.rightSplit.collapsed,
    leaf.view.containerEl.isShown,
    isMediaFile,
  ]);

  React.useEffect(() => {
    updateActiveFile();
    const debouncedUpdate = debounce(updateActiveFile, 300);

    // Attach event listeners
    plugin.app.workspace.on("file-open", debouncedUpdate);
    plugin.app.workspace.on("active-leaf-change", debouncedUpdate);

    // Cleanup function to remove event listeners
    return () => {
      plugin.app.workspace.off("file-open", debouncedUpdate);
      plugin.app.workspace.off("active-leaf-change", debouncedUpdate);
      debouncedUpdate.cancel();
    };
  }, [updateActiveFile, plugin.app.workspace]);

  const refreshContext = React.useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1);
    setError(null);
    
    // Force reset the state variables that determine what's displayed
    setActiveFile(null);
    setNoteContent("");
    
    // Then update the active file with fresh checks
    setTimeout(() => {
      updateActiveFile();
    }, 50); // Small delay to ensure state is cleared before updating
  }, [updateActiveFile]);

  const renderSection = React.useCallback(
    (component: React.ReactNode, errorMessage: string) => {
      try {
        return component;
      } catch (err) {
        logger.error(errorMessage, err);
        return <div className="section-error">{errorMessage}</div>;
      }
    },
    []
  );

  const handleDelete = React.useCallback(async () => {
    if (!activeFile) return;

    try {
      await plugin.app.vault.delete(activeFile);
      new Notice("File deleted successfully");
    } catch (err) {
      logger.error("Error deleting file:", err);
      setError("Failed to delete file");
    }
  }, [activeFile, plugin.app.vault]);

  // Then check license
  if (!isLicenseValid) {
    return (
      <div className={tw("flex flex-col h-full")}>
        <div className={tw("flex gap-2 items-center px-3 py-2 border-b border-[--background-modifier-border]")}>
          <RefreshButton onRefresh={refreshContext} />
        </div>
        <div className={tw("px-3")}>
          <LicenseValidator
            apiKey={plugin.settings.API_KEY}
            onValidationComplete={() => setIsLicenseValid(true)}
            plugin={plugin}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={tw("flex flex-col h-full")}>
        <div className={tw("flex gap-2 items-center px-3 py-2 border-b border-[--background-modifier-border]")}>
          <RefreshButton onRefresh={refreshContext} />
        </div>
        <div className={tw("px-3")}>
          <EmptyState
            message={`Error: ${error}. Click refresh to try again.`}
            showRefresh={false}
            onRefresh={refreshContext}
          />
        </div>
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className={tw("flex flex-col h-full")}>
        <div className={tw("flex gap-2 items-center px-3 py-2 border-b border-[--background-modifier-border]")}>
          <RefreshButton onRefresh={refreshContext} />
        </div>
        <div className={tw("px-3")}>
          <EmptyState message="Open a file " />
        </div>
      </div>
    );
  }
  
  if (isInIgnoredPatterns) {
    return (
      <div className={tw("flex flex-col h-full")}>
        <div className={tw("flex gap-2 items-center px-3 py-2 border-b border-[--background-modifier-border]")}>
          <RefreshButton onRefresh={refreshContext} />
        </div>
        <div className={tw("px-3")}>
          <EmptyState message="This file is part of an ignored folder and will not be processed." />
        </div>
      </div>
    );
  }

  if (isMediaFile) {
    return (
      <div className={tw("flex flex-col h-full")}>
        <div className={tw("flex gap-2 items-center px-3 py-2 border-b border-[--background-modifier-border]")}>
          <RefreshButton onRefresh={refreshContext} />
        </div>
        <div className={tw("px-3")}>
          <EmptyState message="To process an image or audio file, move it to the Note Companion Inbox Folder (e.g. for image text extraction or audio transcription)." />
        </div>
      </div>
    );
  }
  
  if (!noteContent.trim()) {
    return (
      <div className={tw("flex flex-col h-full")}>
        <div className={tw("flex gap-2 items-center px-3 py-2 border-b border-[--background-modifier-border]")}>
          <RefreshButton onRefresh={refreshContext} />
        </div>
        <div className={tw("px-3")}>
          <EmptyState
            message="This file is empty. Add some content and click refresh to see AI suggestions."
            showRefresh={false}
            onRefresh={refreshContext}
            showDelete={true}
            onDelete={handleDelete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={tw("flex flex-col h-full overflow-y-auto")}>
      {/* Compact header - flush to edges */}
      <div className={tw("flex gap-2 items-center px-3 py-2 border-b border-[--background-modifier-border] bg-[--background-primary] sticky top-0 z-10")}>
        <RefreshButton onRefresh={refreshContext} />
        <div className={tw("text-xs text-[--text-normal] font-medium truncate")}>{activeFile.basename}</div>
      </div>

      {/* Content sections - consistent padding with other tabs */}
      <div className={tw("flex flex-col px-3")}>
        {renderSection(
          <ClassificationContainer
            plugin={plugin}
            file={activeFile}
            content={noteContent}
            refreshKey={refreshKey}
          />,
          "Error loading classification"
        )}

        <SectionHeader text="Tags" icon="🏷️ " />
        {renderSection(
          <SimilarTags
            plugin={plugin}
            file={activeFile}
            content={noteContent}
            refreshKey={refreshKey}
          />,
          "Error loading tags"
        )}

        {plugin.settings.enableTitleSuggestions && (
          <>
            <SectionHeader text="Titles" icon="💡 " />
            {renderSection(
              <RenameSuggestion
                plugin={plugin}
                file={activeFile}
                content={noteContent}
                refreshKey={refreshKey}
              />,
              "Error loading title suggestions"
            )}
          </>
        )}

        <SectionHeader text="Folders" icon="📁 " />
        {renderSection(
          <SimilarFolderBox
            plugin={plugin}
            file={activeFile}
            content={noteContent}
            refreshKey={refreshKey}
          />,
          "Error loading folder suggestions"
        )}

        {plugin.settings.enableAtomicNotes && (
          <>
            <SectionHeader text="Atomic notes" icon="✂️ " />
            {renderSection(
              <AtomicNotes plugin={plugin} activeFile={activeFile} refreshKey={refreshKey} />,
              "Error loading atomic notes"
            )}
          </>
        )}

        {hasAudioEmbed(noteContent) && (
          <>
            <SectionHeader text="Audio Transcription" icon="🎙️ " />
            {renderSection(
              <TranscriptionButton
                plugin={plugin}
                file={activeFile}
                content={noteContent}
              />,
              "Error loading transcription button"
            )}
          </>
        )}
      </div>
    </div>
  );
};

const hasAudioEmbed = (content: string): boolean => {
  const audioRegex = /!\[\[(.*\.(mp3|wav|m4a|ogg|webm))]]/i;
  return audioRegex.test(content);
};
