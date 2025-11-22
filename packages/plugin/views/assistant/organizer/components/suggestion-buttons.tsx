import * as React from "react";
import { motion } from "framer-motion";
import { tw } from "@/lib/utils";

// Confidence Badge Component
const ConfidenceBadge: React.FC<{ score: number }> = ({ score }) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-[--text-success] text-white";
    if (score >= 60) return "bg-[--text-warning] text-white";
    return "bg-[--text-muted] text-white";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 60) return "Med";
    return "Low";
  };

  return (
    <span
      className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${getConfidenceColor(score)}`}
      title={`Confidence: ${score}%`}
    >
      {getConfidenceLabel(score)}
    </span>
  );
};

// Base Folder Button Component
const BaseFolderButton: React.FC<{
  folder: string;
  onClick: (folder: string) => void;
  className?: string;
  score?: number;
  reason?: string;
}> = ({ folder, onClick, className, score, reason }) => (
  <motion.button
    className={`px-3 py-1 transition-colors duration-200 ${className} flex items-center justify-between`}
    onClick={() => onClick(folder)}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.2 }}
    title={`Reason: ${reason}`}
  >
    <span>{folder}</span>
    {score !== undefined && <ConfidenceBadge score={score} />}
  </motion.button>
);

// Existing Folder Button Component
export const ExistingFolderButton: React.FC<{
  folder: string;
  onClick: (folder: string) => void;
  score: number;
  reason: string;
}> = props => (
  <BaseFolderButton
    {...props}
    className="bg-[--background-secondary] text-[--text-normal] hover:bg-[--interactive-accent] hover:text-[--text-on-accent] border border-solid border-[--background-modifier-border]"
  />
);

// New Folder Button Component
export const NewFolderButton: React.FC<{
  folder: string;
  onClick: (folder: string) => void;
  score: number;
  reason: string;
}> = props => (
  <BaseFolderButton
    {...props}
    className="bg-[--background-secondary] text-[--text-normal] hover:bg-[--interactive-accent] hover:text-[--text-on-accent] border border-dashed border-[--text-muted]"
  />
); 