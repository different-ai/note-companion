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

  return (
    <div className="flex flex-col h-full w-full bg-[--background-primary]">
      {/* Removed duplicate New Conversation button - now handled in ChatComponent header */}
      <div className="flex-1 min-h-0 w-full">
        <ChatComponent
          plugin={plugin}
          apiKey={apiKey}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
};

export default AIChatSidebar;
