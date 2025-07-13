import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlugin } from "../provider";
import { TFile, Notice } from "obsidian";
import { OnboardingWizard } from "./onboarding-wizard";
import { CollapsibleSection } from "./collapsible-section";
import { FloatingActionButton } from "./floating-action-button";
import { ProgressBar } from "./progress-bar";
import Chat from "../ai-chat/container";
import { AssistantView as Organizer } from "../organizer/organizer";

type SectionType = "organizer" | "inbox" | "chat";

/**
 * This is the main container merging the top-level features:
 *  - Onboarding
 *  - Collapsible sections (organizer, inbox, chat)
 *  - Floating Action Button for context-aware quick actions
 *  - Basic real-time progress status
 */
export function MainDashboard() {
  const plugin = usePlugin();
  
  // Track whether user finished onboarding
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(
    plugin.settings.hasRunOnboarding ?? false
  );

  // Which sections are currently expanded
  const [expandedSections, setExpandedSections] = useState<SectionType[]>([
    "organizer",
  ]);

  // A simple loading state for a background task
  const [isLongTaskRunning, setIsLongTaskRunning] = useState(false);
  const [longTaskProgress, setLongTaskProgress] = useState(0);

  // Example: track the active file to display context
  const [activeFile, setActiveFile] = useState<TFile | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load the active file from Obsidian
  useEffect(() => {
    const handleFileOpen = async () => {
      const file = plugin.app.workspace.getActiveFile();
      if (file) {
        try {
          const content = await plugin.app.vault.read(file);
          setActiveContent(content);
          setActiveFile(file);
        } catch (error) {
          console.error("Error reading file:", error);
          setActiveContent("");
        }
      } else {
        setActiveFile(null);
        setActiveContent("");
      }
    };
    handleFileOpen();
    plugin.app.workspace.on("file-open", handleFileOpen);
    return () => {
      plugin.app.workspace.off("file-open", handleFileOpen);
    };
  }, [plugin.app]);

  // Example function that simulates a "long-running task" for demonstration
  const startLongTask = async () => {
    setIsLongTaskRunning(true);
    setLongTaskProgress(0);
    let progress = 0;
    while (progress < 100) {
      await new Promise(res => setTimeout(res, 200));
      progress += 10;
      setLongTaskProgress(progress);
    }
    // Finish
    setIsLongTaskRunning(false);
    new Notice("Long task completed!");
  };

  /** Toggles whether a collapsible section is open */
  const toggleSection = (section: SectionType) => {
    setExpandedSections(prev => {
      if (prev.includes(section)) {
        return prev.filter(s => s !== section);
      } else {
        return [...prev, section];
      }
    });
  };

  // Handle finishing the onboarding wizard
  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
    plugin.settings.hasRunOnboarding = true;
    plugin.saveSettings();
  };

  // The floating button can provide context-based suggestions
  // E.g. if user is in a "meeting note", show "Enhance Meeting"
  const getFloatingButtonLabel = () => {
    if (!activeFile) return "No File";
    const name = activeFile.basename.toLowerCase();
    if (name.includes("meeting")) return "Enhance Meeting";
    if (name.includes("notes")) return "Organize Note";
    return "Quick Action";
  };

  // Example quick action triggered by the FAB
  const handleFABAction = () => {
    if (!activeFile) {
      new Notice("No active file to operate on!");
      return;
    }
    // Suppose we see "meeting" in the name -> do "enhanceMeeting()"
    if (activeFile.basename.toLowerCase().includes("meeting")) {
      // plugin.enhanceMeetingNote(activeFile);
      new Notice("Meeting note enhanced!");
    } else {
      // Else do a generic action
      // plugin.organizeFile(activeFile);
      new Notice(`Organized: ${activeFile.basename}`);
    }
  };

  // If the user hasn't completed onboarding, show that first
  if (!isOnboardingComplete) {
    return <OnboardingWizard plugin={plugin} onComplete={handleOnboardingComplete} />;
  }

  // Otherwise, render the main "merged" UI
  return (
    <div className="flex flex-col h-full relative p-2">
      {/** 1) Basic progress feedback if a background task is running */}
      {isLongTaskRunning && (
        <div className="p-2 bg-[--background-secondary] mb-2 rounded">
          <ProgressBar value={longTaskProgress} />
        </div>
      )}

      {/** 2) Collapsible Sections */}
      <CollapsibleSection
        title="Organizer"
        isOpen={expandedSections.includes("organizer")}
        onToggle={() => toggleSection("organizer")}
      >
        <div className="p-2">
          <Organizer 
            plugin={plugin} 
            leaf={plugin.app.workspace.activeLeaf} 
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Inbox"
        isOpen={expandedSections.includes("inbox")}
        onToggle={() => toggleSection("inbox")}
      >
        <div className="p-2">
          <p>Inbox logs or quick file processing UI here.</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Chat"
        isOpen={expandedSections.includes("chat")}
        onToggle={() => toggleSection("chat")}
      >
        <div className="p-2">
          <Chat plugin={plugin} apiKey={plugin.getApiKey()} />
        </div>
      </CollapsibleSection>


      {/** 3) A floating action button for context-based "quick actions" */}
      <FloatingActionButton
        label={getFloatingButtonLabel()}
        onClick={handleFABAction}
      />
    </div>
  );
}
