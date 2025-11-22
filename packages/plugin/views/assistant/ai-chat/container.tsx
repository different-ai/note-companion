import React, { useEffect, useRef, useState } from "react";
import { ChatComponent } from "./chat";
import FileOrganizer from "../../..";
import { Card } from "./card";
import { Button } from "./button";
interface AIChatSidebarProps {
  plugin: FileOrganizer;
  apiKey: string;
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ plugin, apiKey }) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<
    { id: string; role: string; content: string }[][]
  >([[]]);
  const [currentConversationIndex, setCurrentConversationIndex] =
    useState<number>(0);

  const startNewConversation = () => {
    setConversations([...conversations, []]);
    setCurrentConversationIndex(conversations.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl/Cmd + N is pressed and the input ref is focused
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault(); // Prevent default browser behavior
        startNewConversation();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [conversations]); // Include conversations in dependencies since startNewConversation uses it

  return (
    <div className="flex flex-col h-full w-full bg-[--background-primary]">
      <div className="relative flex-none h-10 bg-[--background-primary]">
        <Button
          onClick={startNewConversation}
          className="h-6 w-6 p-1 rounded-full bg-[--interactive-accent] text-[--text-on-accent] hover:bg-[--interactive-accent-hover] transition-colors duration-200 absolute top-2 right-2 z-10"
          aria-label="New Conversation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <ChatComponent
          key={currentConversationIndex}
          plugin={plugin}
          apiKey={apiKey}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
};

export default AIChatSidebar;
