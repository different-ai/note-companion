import { AppDetector } from '@screenpipe/js';
import NotificationService from './notification-service';

interface MeetingConfig {
  enableZoom: boolean;
  enableGoogleMeet: boolean;
  enableAudioDetection: boolean;
  notificationDuration: number; // in seconds
}

interface MeetingState {
  isInMeeting: boolean;
  appName: string | null;
  startTime: number | null;
}

class MeetingDetector {
  private config: MeetingConfig;
  private state: MeetingState;
  private detector: AppDetector;
  private static instance: MeetingDetector;

  private constructor() {
    this.config = {
      enableZoom: true,
      enableGoogleMeet: true,
      enableAudioDetection: true,
      notificationDuration: 10
    };

    this.state = {
      isInMeeting: false,
      appName: null,
      startTime: null
    };

    this.detector = new AppDetector();
    this.initializeDetector();
  }

  public static getInstance(): MeetingDetector {
    if (!MeetingDetector.instance) {
      MeetingDetector.instance = new MeetingDetector();
    }
    return MeetingDetector.instance;
  }

  private initializeDetector() {
    this.detector.on('appChange', (app: any) => {
      if (this.isMeetingApp(app.name)) {
        if (!this.state.isInMeeting) {
          this.handleMeetingStart(app.name);
        }
      } else if (this.state.isInMeeting) {
        this.handleMeetingEnd();
      }
    });

    // Initialize audio detection if enabled
    if (this.config.enableAudioDetection) {
      this.initializeAudioDetection();
    }
  }

  private async initializeAudioDetection() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      source.connect(analyzer);

      // Monitor audio levels
      const checkAudioLevel = () => {
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // If high audio level detected and not already in meeting
        if (average > 50 && !this.state.isInMeeting) {
          this.handleMeetingStart('Audio Detection');
        }
      };

      setInterval(checkAudioLevel, 1000);
    } catch (error) {
      console.error('Failed to initialize audio detection:', error);
    }
  }

  private isMeetingApp(appName: string): boolean {
    const meetingApps = [
      this.config.enableZoom && 'zoom',
      this.config.enableGoogleMeet && 'meet.google.com'
    ].filter(Boolean);

    return meetingApps.some(app => {
      if (typeof app === 'string') {
        return appName.toLowerCase().includes(app.toLowerCase());
      }
      return false;
    });
  }

  private handleMeetingStart(appName: string) {
    this.state.isInMeeting = true;
    this.state.appName = appName;
    this.state.startTime = Date.now();
    this.showNotification();
  }

  private handleMeetingEnd() {
    this.state.isInMeeting = false;
    this.state.appName = null;
    this.state.startTime = null;
  }

  private showNotification() {
    const notificationService = NotificationService.getInstance();
    notificationService.showMeetingNotification({
      appName: this.state.appName || 'Unknown App',
      startTime: this.state.startTime || Date.now()
    });
  }

  public updateConfig(newConfig: Partial<MeetingConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getState(): MeetingState {
    return { ...this.state };
  }
}

export default MeetingDetector;