import React from 'react';
import { Button } from './ui/button';

interface MeetingNotificationProps {
  appName: string;
  onOpenNote: () => void;
  onDismiss: () => void;
}

export function MeetingNotification({ appName, onOpenNote, onDismiss }: MeetingNotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg border border-gray-200 max-w-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Meeting Detected</h3>
            <p className="text-sm text-gray-600 mt-1">
              {appName} meeting in progress. Would you like to create a note?
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onOpenNote}
          >
            Open Note
          </Button>
        </div>
      </div>
    </div>
  );
} 