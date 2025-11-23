import { Button } from "../button";
import { Plus } from "lucide-react";

interface NewChatButtonProps {
  onClick: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="bg-[--interactive-normal] hover:bg-[--interactive-hover] text-[--text-normal] gap-1.5"
      aria-label="Start new chat"
    >
      <Plus className="w-4 h-4" />
      <span className="text-xs">New</span>
    </Button>
  );
}
