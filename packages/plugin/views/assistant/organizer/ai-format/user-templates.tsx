import * as React from "react";
import { TFile } from "obsidian";
import FileOrganizer from "../../../../index";
import { logMessage } from "../../../../someUtils";
import { logger } from "../../../../services/logger";
import {
  cleanup,
  getTokenCount,
  initializeTokenCounter,
} from "../../../../utils/token-counter";

interface UserTemplatesProps {
  plugin: FileOrganizer;
  file: TFile | null;
  content: string;
  refreshKey: number;
  onFormat: (templateName: string) => void;
}

export const UserTemplates: React.FC<UserTemplatesProps> = ({
  plugin,
  file,
  content,
  refreshKey,
  onFormat,
}) => {
  const [templateNames, setTemplateNames] = React.useState<string[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = React.useState<
    string | null
  >(null);
  const [showDropdown, setShowDropdown] = React.useState<boolean>(false);
  const [formatting, setFormatting] = React.useState<boolean>(false);
  const [contentLoadStatus, setContentLoadStatus] = React.useState<
    "loading" | "success" | "error"
  >("loading");
  const [classificationStatus, setClassificationStatus] = React.useState<
    "loading" | "success" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isFileTooLarge, setIsFileTooLarge] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;

    const checkTokenCount = async () => {
      try {
        await initializeTokenCounter();
        if (isMounted) {
          const tokenCount = getTokenCount(content);
          setIsFileTooLarge(tokenCount > 128000);
        }
      } catch (error) {
        console.error("Error checking token count:", error);
      }
    };

    checkTokenCount();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [content]);

  React.useEffect(() => {
    const fetchClassificationAndTemplates = async () => {
      if (!content || !file) {
        setContentLoadStatus("error");
        logger.error("No content or file available");
        return;
      }

      setContentLoadStatus("loading");
      setClassificationStatus("loading");

      try {
        const fileContent = await plugin.app.vault.read(file);
        if (typeof fileContent !== "string") {
          throw new Error("File content is not a string");
        }
        logMessage(fileContent, "fileContent");
        setContentLoadStatus("success");

        const fetchedTemplateNames = await plugin.getTemplateNames();
        setTemplateNames(fetchedTemplateNames);
        logMessage(fetchedTemplateNames, "fetchedTemplateNames");

        const classifiedAs = await plugin.classifyContentV2(
          fileContent,
          fetchedTemplateNames
        );
        logMessage(classifiedAs, "classifiedAs");

        const selectedClassification = fetchedTemplateNames.find(
          t => t.toLowerCase() === classifiedAs?.toLowerCase()
        );
        if (selectedClassification) {
          setSelectedTemplateName(selectedClassification);
        } else {
          console.warn(
            "No matching classification found, using empty classification"
          );
          setSelectedTemplateName(null);
        }
        setClassificationStatus("success");
      } catch (error) {
        logger.error("Error in fetchClassificationAndTemplates:", error);
        setClassificationStatus("error");
      }
    };
    fetchClassificationAndTemplates();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [content, file, plugin, refreshKey]);

  const getDisplayText = () => {
    if (selectedTemplateName) {
      return `Format as ${selectedTemplateName}`;
    }
    return "Select template";
  };

  const dropdownTemplates = templateNames.filter(
    t => t !== selectedTemplateName
  );

  const handleFormatClick = () => {
    if (selectedTemplateName) {
      onFormat(selectedTemplateName);
    }
  };

  const renderContent = () => {
    if (contentLoadStatus === "error" || classificationStatus === "error") {
      return (
        <div className="text-[--text-error] p-2 bg-[--background-modifier-error]">
          Unable to process the content. Please try again later.
        </div>
      );
    }
    if (classificationStatus === "loading") {
      return (
        <div className="text-[--text-muted] p-2">Classifying content...</div>
      );
    }

    return (
      <div className="flex flex-col space-y-2">
        <div className="relative" ref={dropdownRef}>
          <button
            className="w-full flex items-center justify-between px-3 py-2 bg-[--background-secondary] text-[--text-normal] hover:bg-[--background-modifier-hover] transition-colors duration-200"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span>{getDisplayText()}</span>
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
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-[--background-primary] border border-[--background-modifier-border]">
              {dropdownTemplates.length > 0 ? (
                dropdownTemplates.map((templateName, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 cursor-pointer hover:bg-[--background-modifier-hover] text-[--text-normal]"
                    onClick={() => {
                      setSelectedTemplateName(templateName);
                      setShowDropdown(false);
                    }}
                  >
                    {templateName}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-[--text-muted]">
                  No templates available
                </div>
              )}
            </div>
          )}
        </div>
        {isFileTooLarge && (
          <div className="text-[--text-error] p-2 bg-[--background-modifier-error]">
            File is too large to format.
          </div>
        )}
        <button
          className={`px-4 py-2 rounded-md transition-colors duration-200 ${
            !selectedTemplateName || formatting
              ? "bg-[--background-modifier-border] text-[--text-muted] cursor-not-allowed"
              : "bg-[--interactive-accent] text-white hover:bg-[--interactive-accent-hover]"
          }`}
          disabled={!selectedTemplateName || formatting || isFileTooLarge}
          onClick={handleFormatClick}
        >
          {formatting ? "Applying..." : "Apply"}
        </button>
      </div>
    );
  };

  return <div className="">{renderContent()}</div>;
};
