import { toast } from '@/components/ui/use-toast';

interface NotificationConfig {
  obsidianDeepLink: string;
  notificationTitle: string;
  notificationBody: string;
  actionLabel: string;
}

class NotificationService {
  private static instance: NotificationService;
  private config: NotificationConfig;

  private constructor() {
    this.config = {
      obsidianDeepLink: 'obsidian://new', // Default deep link to create a new note
      notificationTitle: 'Meeting Detected',
      notificationBody: 'Would you like to take notes for this meeting?',
      actionLabel: 'Open in Obsidian'
    };
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public showMeetingNotification(meetingInfo?: { appName: string; startTime: number }) {
    const formattedTime = new Date(meetingInfo?.startTime || Date.now()).toLocaleTimeString();
    const appName = meetingInfo?.appName || 'Unknown App';

    toast({
      title: this.config.notificationTitle,
      description: `${this.config.notificationBody}\nMeeting started at ${formattedTime} in ${appName}`,
      duration: 10000 // 10 seconds
    });
  }

  private openObsidian() {
    try {
      // Generate a deep link with current date and time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString().replace(/:/g, '-');
      
      // Add metadata to note title for better organization
      const noteTitle = `Meeting Notes ${dateStr} ${timeStr}`;
      
      // Construct the deep link with proper encoding
      const params = new URLSearchParams({
        name: noteTitle,
        time: now.toISOString()
      });
      
      const deepLink = `${this.config.obsidianDeepLink}?${params.toString()}`;
      
      // Navigate to Obsidian
      window.location.href = deepLink;
    } catch (error) {
      console.error('Failed to open Obsidian:', error);
      toast({
        title: 'Error',
        description: 'Failed to open Obsidian. Please try again.',
        duration: 5000
      });
    }
  }

  public updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

export default NotificationService;