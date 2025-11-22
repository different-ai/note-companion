import * as React from "react";
import { Notice, TFile, TFolder } from "obsidian";
import FileOrganizer from "../../../../index";
import { logMessage } from "../../../../someUtils";
import { logger } from "../../../../services/logger";

interface FabricClassificationBoxProps {
  plugin: FileOrganizer;
  file: TFile | null;
  content: string;
  refreshKey: number;
  onFormat: (patternName: string) => void;
}

type FabricPattern = {
  name: string;
};

export const FabricClassificationBox: React.FC<
  FabricClassificationBoxProps
> = ({ plugin, file, content, refreshKey, onFormat }) => {
  const [fabricPatterns, setFabricPatterns] = React.useState<FabricPattern[]>(
    []
  );
  const [selectedFabricPattern, setSelectedFabricPattern] =
    React.useState<FabricPattern | null>(null);
  const [showFabricDropdown, setShowFabricDropdown] =
    React.useState<boolean>(false);
  const [isFormatting, setIsFormatting] = React.useState<boolean>(false);
  const [loadStatus, setLoadStatus] = React.useState<"success" | "error">(
    "success"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [classifiedPattern, setClassifiedPattern] = React.useState<
    string | null
  >(null);

  const fabricDropdownRef = React.useRef<HTMLDivElement>(null);
  const patternsPath = React.useMemo(
    () => `${plugin.settings.fabricPaths}/patterns`,
    [plugin.settings.fabricPaths]
  );

  /**
   * Formats content using Fabric structure.
   */
  const formatFabricContent = async (params: {
    file: TFile;
    content: string;
    systemContent: string;
  }): Promise<void> => {
    try {
      const response = await fetch(
        `${plugin.getServerUrl()}/api/fabric-classify/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${plugin.settings.API_KEY}`,
          },
          body: JSON.stringify({
            content: params.content,
            systemContent: params.systemContent,
            enableFabric: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Fabric formatting failed with status: ${response.status}`
        );
      }

      const data = await response.json();
      await plugin.app.vault.modify(params.file, data.formattedContent);
      new Notice("Content formatted successfully with Fabric.", 3000);
    } catch (error) {
      logger.error("Error in formatFabricContent:", error);
      new Notice(`Formatting failed: ${(error as Error).message}`, 5000);
    }
  };

  /**
   * Automatically classifies the content using the /api/classify1 endpoint.
   */
  const autoClassifyContent = React.useCallback(async () => {
    if (!content || !file || fabricPatterns.length === 0) {
      return;
    }

    try {
      logMessage("Attempting auto-classification");
      const response = await fetch(`${plugin.getServerUrl()}/api/classify1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${plugin.settings.API_KEY}`,
        },
        body: JSON.stringify({
          content: content,
          fileName: file.name,
          templateNames: fabricPatterns.map(pattern => pattern.name),
        }),
      });

      if (!response.ok) {
        throw new Error(`Classification failed with status: ${response.status}`);
      }

      const { documentType } = await response.json();
      logMessage("Classified as:", documentType);
      setClassifiedPattern(documentType);

      const matchedPattern = fabricPatterns.find(pattern => pattern.name === documentType);
      if (matchedPattern) {
        setSelectedFabricPattern(matchedPattern);
      }

    } catch (error) {
      logger.error("Error in autoClassifyContent:", error);
      setErrorMessage(`Classification failed: ${(error as Error).message}`);
    }
  }, [content, file, fabricPatterns, plugin]);

  React.useEffect(() => {
    if (!content || !file) return;
    if (!fabricPatterns) return;
    logMessage("autoClassifyContent", fabricPatterns);
    autoClassifyContent();
  }, [content, file, plugin, refreshKey, fabricPatterns]);

  React.useEffect(() => {
    const fetchFabricPatternsEffect = async () => {
      if (!content || !file) {
        setLoadStatus("error");
        logger.error("No content or file available for Fabric classification");
        return;
      }

      try {
        logMessage(patternsPath);
        const patternFolder =
          plugin.app.vault.getAbstractFileByPath(patternsPath);
        logMessage(patternFolder);

        if (!patternFolder || !(patternFolder instanceof TFolder)) {
          throw new Error(
            `Fabric patterns directory not found: ${patternsPath}`
          );
        }

        const folders = patternFolder.children.filter(
          file => file instanceof TFolder
        ) as TFolder[];
        const patterns = folders.map(folder => ({ name: folder.name }));

        if (!patterns.length) {
          throw new Error("No Fabric patterns found");
        }

        setFabricPatterns(patterns);
        setLoadStatus("success");
      } catch (error) {
        logger.error("Error fetching Fabric patterns:", error);
        setLoadStatus("error");
        setFabricPatterns([]);
      }
    };

    fetchFabricPatternsEffect();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        fabricDropdownRef.current &&
        !fabricDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFabricDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };

    // Auto-classify when content or file changes
  }, [content, file, plugin, refreshKey, patternsPath]);

  /**
   * Handles applying the selected Fabric pattern.
   */
  const handleApplyFabric = async (pattern: FabricPattern) => {
    try {
      setIsFormatting(true);
      if (!file) throw new Error("No file selected");
      if (!pattern || typeof pattern.name !== "string") {
        throw new Error("Invalid Fabric pattern");
      }

      // Create a backup of the file before formatting
      const backupFile = await plugin.backupTheFileAndAddReferenceToCurrentFile(file);

      const systemFilePath = `${patternsPath}/${pattern.name}/system.md`;
      const systemFile = plugin.app.vault.getAbstractFileByPath(
        systemFilePath
      ) as TFile;

      if (!systemFile) {
        throw new Error(`System file not found for pattern: ${pattern.name}`);
      }

      const systemContent = await plugin.app.vault.read(systemFile);
      const fileContent = await plugin.app.vault.read(file);

      let formattedContent = "";
      const updateCallback = async (partialContent: string) => {
        formattedContent = partialContent;
        await plugin.app.vault.modify(file, formattedContent);
      };

      await plugin.formatStream(
        fileContent,
        systemContent,
        plugin.getServerUrl(),
        plugin.settings.API_KEY,
        updateCallback
      );

      // Append the backup link to the current file
      await plugin.appendBackupLinkToCurrentFile(file, backupFile);
      // Append the formatted link to the backup file
      await plugin.appendFormattedLinkToBackupFile(backupFile, file);

      setSelectedFabricPattern(null);
      new Notice("Content formatted successfully with Fabric", 3000);
    } catch (error) {
      logger.error("Error in handleApplyFabric:", error);
      setErrorMessage((error as Error).message);
    } finally {
      setIsFormatting(false);
    }
  };

  /**
   * Returns display text based on selected Fabric pattern.
   */
  const getFabricDisplayText = () => {
    if (selectedFabricPattern) {
      return `Format as ${selectedFabricPattern.name}`;
    }
    return "Select Fabric Pattern";
  };

  const availableFabricPatterns = fabricPatterns.filter(
    t => t.name !== selectedFabricPattern?.name
  );

  /**
   * Renders the Fabric pattern selection UI.
   */
  const renderFabricContent = () => {
    if (loadStatus === "error") {
      return (
        <div className="text-[--text-error] p-2 bg-[--background-modifier-error]">
          Unable to load Fabric patterns. Please download them from the
          customization tab.
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-2">
        <div className="relative" ref={fabricDropdownRef}>
          <button
            className="w-full flex items-center justify-between px-3 py-2 bg-[--background-secondary] text-[--text-normal] hover:bg-[--background-modifier-hover] transition-colors duration-200"
            onClick={() => setShowFabricDropdown(!showFabricDropdown)}
          >
            <span>{getFabricDisplayText()}</span>
            <svg
              className="w-4 h-4 ml-2"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {showFabricDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-[--background-primary] border border-[--background-modifier-border]">
              {availableFabricPatterns.length > 0 ? (
                availableFabricPatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 cursor-pointer hover:bg-[--background-modifier-hover] text-[--text-normal]"
                    onClick={() => {
                      setSelectedFabricPattern(pattern);
                      setShowFabricDropdown(false);
                    }}
                  >
                    {pattern.name}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-[--text-muted]">
                  No Fabric patterns available
                </div>
              )}
            </div>
          )}
        </div>
        <button
          className={`px-4 py-2  transition-colors duration-200 ${
            !selectedFabricPattern || isFormatting
              ? "bg-[--background-modifier-border] text-[--text-muted] cursor-not-allowed"
              : "bg-[--interactive-accent] text-white hover:bg-[--interactive-accent-hover]"
          }`}
          disabled={!selectedFabricPattern || isFormatting}
          onClick={handleApplyFabricClick}
        >
          {isFormatting ? "Applying..." : "Apply"}
        </button>
      </div>
    );
  };

  const handleApplyFabricClick = () => {
    if (selectedFabricPattern) {
      onFormat(selectedFabricPattern.name);
    }
  };

  return (
    <div className="">
      <div className="font-semibold pb-2">Fabric</div>
      {renderFabricContent()}
      {errorMessage && (
        <div className="mt-2 text-[--text-error] p-2 bg-[--background-modifier-error]">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
