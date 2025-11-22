import * as React from "react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  message: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message, 
  showRefresh = false, 
  onRefresh,
  showDelete = false,
  onDelete
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[--background-primary-alt] border-b border-[--background-modifier-border] w-full max-w-md mx-auto">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-6xl mb-4 text-[--text-accent]"
      >
        📝
      </motion.div>
      <motion.p 
        className="text-lg text-[--text-muted] mb-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
      <div className="flex gap-2">
        {showRefresh && onRefresh && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={onRefresh}
            className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[--interactive-normal] hover:bg-[--interactive-hover] text-[--text-normal]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Refresh</span>
          </motion.button>
        )}
        {showDelete && onDelete && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={onDelete}
            className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[--background-modifier-error] hover:bg-[--background-modifier-error-hover] text-[--text-on-accent]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};