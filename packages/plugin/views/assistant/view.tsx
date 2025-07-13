import { ItemView, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { Root, createRoot } from "react-dom/client";
import { AssistantView } from "./organizer/organizer";
import FileOrganizer from "../..";
import { InboxLogs } from "./inbox-logs";
import { SectionHeader } from "./section-header";
import { AppContext } from "./provider";
import AIChatSidebar from "./ai-chat/container";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import ReactMarkdown from 'react-markdown';
import { SyncTab } from "./synchronizer/sync-tab";

export const ORGANIZER_VIEW_TYPE = "fo2k.assistant.sidebar2";

type Tab = "organizer" | "inbox" | "chat" | "sync";

function TabContent({
  activeTab,
  plugin,
  leaf,
}: {
  activeTab: Tab;
  plugin: FileOrganizer;
  leaf: WorkspaceLeaf;
}) {
  const [activeFile, setActiveFile] = React.useState<TFile | null>(null);
  const [noteContent, setNoteContent] = React.useState<string>("");
  const [refreshKey, setRefreshKey] = React.useState<number>(0);

  React.useEffect(() => {
    const updateActiveFile = async () => {
      const file = plugin.app.workspace.getActiveFile();
      if (file) {
        const content = await plugin.app.vault.read(file);
        setNoteContent(content);
        setActiveFile(file);
      }
    };
    updateActiveFile();

    const handler = () => {
      updateActiveFile();
    };

    plugin.app.workspace.on("file-open", handler);
    plugin.app.workspace.on("active-leaf-change", handler);

    return () => {
      plugin.app.workspace.off("file-open", handler);
      plugin.app.workspace.off("active-leaf-change", handler);
    };
  }, [plugin.app.workspace, plugin.app.vault]);

  function renderNoteContent(content: string) {
    return (
      <div className="markdown-preview">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        className={`absolute inset-0 ${
          activeTab === "organizer" ? "block" : "hidden"
        }`}
      >
        <AssistantView plugin={plugin} leaf={leaf} />
      </div>

      <div
        className={`absolute inset-0 ${
          activeTab === "inbox" ? "block" : "hidden"
        }`}
      >
        <SectionHeader text="Inbox Processing" icon="📥 " />
        <InboxLogs />
      </div>

      <div
        className={`absolute inset-0 ${
          activeTab === "chat" ? "block" : "hidden"
        }`}
      >
        <AIChatSidebar plugin={plugin} apiKey={plugin.settings.API_KEY} />
      </div>


      <div
        className={`absolute inset-0 ${
          activeTab === "sync" ? "block" : "hidden"
        }`}
      >
        <SyncTab plugin={plugin} />
      </div>
    </div>
  );
}

function TabButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
                px-3 py-2 text-sm font-medium shadow-none cursor-pointer bg-transparent
                ${
                  isActive
                    ? "bg-[--interactive-accent] text-black"
                    : "bg-[--background-primary] text-[--text-muted] hover:bg-[--background-modifierhover] hover:text-black"
                }
      `}
    >
      {children}
    </button>
  );
}

function AssistantContent({
  plugin,
  leaf,
  initialTab,
  onTabChange,
}: {
  plugin: FileOrganizer;
  leaf: WorkspaceLeaf;
  initialTab: Tab;
  onTabChange: (setTab: (tab: Tab) => void) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<Tab>(initialTab);

  React.useEffect(() => {
    onTabChange(setActiveTab);
  }, [onTabChange]);

  return (
    <div className="flex flex-col h-full ">
      <div className="flex  shadow-none w-fit space-x-2">
        <TabButton
          isActive={activeTab === "organizer"}
          onClick={() => setActiveTab("organizer")}
        >
          Organizer
        </TabButton>
        <TabButton
          isActive={activeTab === "inbox"}
          onClick={() => setActiveTab("inbox")}
        >
          Inbox
        </TabButton>
        <TabButton
          isActive={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
        >
          Chat
        </TabButton>
        <TabButton
          isActive={activeTab === "sync"}
          onClick={() => setActiveTab("sync")}
        >
          Sync
        </TabButton>
      </div>

      <div className="pt-4 h-full">
        <TabContent activeTab={activeTab} plugin={plugin} leaf={leaf} />
      </div>
    </div>
  );
}

export class AssistantViewWrapper extends ItemView {
  root: Root | null = null;
  plugin: FileOrganizer;
  private activeTab: Tab = "organizer";
  private setActiveTab: (tab: Tab) => void = () => {};

  constructor(leaf: WorkspaceLeaf, plugin: FileOrganizer) {
    super(leaf);
    this.plugin = plugin;

    // Register commands
    this.plugin.addCommand({
      id: "open-organizer-tab",
      name: "Open Organizer Tab",
      callback: () => this.activateTab("organizer"),
    });

    this.plugin.addCommand({
      id: "open-inbox-tab",
      name: "Open Inbox Tab",
      callback: () => this.activateTab("inbox"),
    });

    this.plugin.addCommand({
      id: "open-chat-tab",
      name: "Open Chat Tab",
      callback: () => this.activateTab("chat"),
    });

    
    this.plugin.addCommand({
      id: "open-sync-tab",
      name: "Open Sync Tab",
      callback: () => this.activateTab("sync"),
    });
  }

  activateTab(tab: Tab) {
    // Ensure view is open
    this.plugin.app.workspace.revealLeaf(this.leaf);

    // Update tab
    this.activeTab = tab;
    this.setActiveTab(tab);
  }

  getViewType(): string {
    return ORGANIZER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Note Companion";
  }

  getIcon(): string {
    return "sparkle";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.addClass('fo2k-view');
    this.root = createRoot(container);
    this.render();
  }

  render(): void {
    this.root?.render(
      <AppContext.Provider value={{ plugin: this.plugin, root: this.root }}>
        <React.StrictMode>
          <TooltipProvider>
            <AssistantContent
              plugin={this.plugin}
              leaf={this.leaf}
              initialTab={this.activeTab}
              onTabChange={setTab => {
                this.setActiveTab = setTab;
              }}
            />
          </TooltipProvider>
        </React.StrictMode>
      </AppContext.Provider>
    );
  }

  async onClose(): Promise<void> {
    this.containerEl.children[1].removeClass('fo2k-view');
    this.root?.unmount();
  }
}
