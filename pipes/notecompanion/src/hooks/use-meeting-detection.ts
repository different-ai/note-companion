import { useEffect, useState } from 'react';
import { pipe } from '@screenpipe/browser';

interface MeetingState {
  isInMeeting: boolean;
  appName: string | null;
  startTime: Date | null;
}

const MEETING_APPS = ['zoom.us', 'meet.google.com', 'teams.microsoft.com', 'webex.com'];

export function useMeetingDetection() {
  const [meetingState, setMeetingState] = useState<MeetingState>({
    isInMeeting: false,
    appName: null,
    startTime: null,
  });

  useEffect(() => {
    const abortController = new AbortController();

    const initializeDetection = async () => {
      try {
        // Use streamVision as an async generator
        for await (const event of pipe.streamVision()) {
          if (abortController.signal.aborted) break;

          const { app_name: appName, window_name: url } = event.data;
          
          // Check if current app/url is a meeting app
          const isMeetingApp = MEETING_APPS.some(app => 
            url?.includes(app) || appName?.toLowerCase().includes(app.split('.')[0])
          );

          if (isMeetingApp && !meetingState.isInMeeting) {
            // User just entered a meeting
            setMeetingState({
              isInMeeting: true,
              appName: appName || url || 'Unknown Meeting App',
              startTime: new Date(),
            });
          } else if (!isMeetingApp && meetingState.isInMeeting) {
            // User left the meeting
            setMeetingState({
              isInMeeting: false,
              appName: null,
              startTime: null,
            });
          }
        }
      } catch (error) {
        console.error('Failed to initialize meeting detection:', error);
      }
    };

    initializeDetection();

    return () => {
      abortController.abort();
    };
  }, [meetingState.isInMeeting]);

  return meetingState;
} 