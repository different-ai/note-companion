// "use client";

import { useEffect, useState } from 'react';
import { useMeetingDetection } from '../hooks/use-meeting-detection';
import { MeetingNotification } from '../components/meeting-notification';

export default function Page() {
  const { isInMeeting, appName } = useMeetingDetection();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isInMeeting) {
      setShowNotification(true);
    }
  }, [isInMeeting]);

  const handleOpenNote = async () => {
    try {
      // Create a deep link to Obsidian with a new note
      const meetingTitle = `Meeting Notes - ${appName} - ${new Date().toLocaleString()}`;
      const encodedTitle = encodeURIComponent(meetingTitle);
      const obsidianUrl = `obsidian://new?vault=YourVault&name=${encodedTitle}`;
      
      // Open the URL
      window.open(obsidianUrl, '_blank');
      
      // Hide the notification
      setShowNotification(false);
    } catch (error) {
      console.error('Failed to open Obsidian:', error);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {showNotification && (
        <MeetingNotification
          appName={appName || 'Unknown'}
          onOpenNote={handleOpenNote}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
