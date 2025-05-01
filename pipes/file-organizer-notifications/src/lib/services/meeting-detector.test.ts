import MeetingDetector from './meeting-detector';
import { AppDetector } from '@screenpipe/js';

// Mock AppDetector
jest.mock('@screenpipe/js', () => ({
  AppDetector: jest.fn().mockImplementation(() => ({
    on: jest.fn((event, callback) => {
      // Store the callback for testing
      (AppDetector as jest.Mock).mockImplementation(() => ({
        triggerAppChange: (appName: string) => callback({ name: appName })
      }));
    })
  }))
}));

describe('MeetingDetector', () => {
  let meetingDetector: typeof MeetingDetector;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (MeetingDetector as any).instance = null;
    jest.clearAllMocks();
  });

  it('should create a singleton instance', () => {
    const instance1 = MeetingDetector.getInstance();
    const instance2 = MeetingDetector.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with default config', () => {
    const detector = MeetingDetector.getInstance();
    expect(detector.getState()).toEqual({
      isInMeeting: false,
      appName: null,
      startTime: null
    });
  });

  it('should detect Zoom meetings', () => {
    const detector = MeetingDetector.getInstance();
    const appDetector = new AppDetector();
    
    // Simulate Zoom app detection
    (appDetector as any).triggerAppChange('zoom');
    
    expect(detector.getState()).toEqual({
      isInMeeting: true,
      appName: 'zoom',
      startTime: expect.any(Number)
    });
  });

  it('should detect Google Meet', () => {
    const detector = MeetingDetector.getInstance();
    const appDetector = new AppDetector();
    
    // Simulate Google Meet detection
    (appDetector as any).triggerAppChange('meet.google.com');
    
    expect(detector.getState()).toEqual({
      isInMeeting: true,
      appName: 'meet.google.com',
      startTime: expect.any(Number)
    });
  });

  it('should handle meeting end', () => {
    const detector = MeetingDetector.getInstance();
    const appDetector = new AppDetector();
    
    // Start meeting
    (appDetector as any).triggerAppChange('zoom');
    
    // End meeting
    (appDetector as any).triggerAppChange('chrome');
    
    expect(detector.getState()).toEqual({
      isInMeeting: false,
      appName: null,
      startTime: null
    });
  });

  it('should update configuration', () => {
    const detector = MeetingDetector.getInstance();
    
    detector.updateConfig({
      enableZoom: false,
      enableGoogleMeet: false
    });

    const appDetector = new AppDetector();
    
    // Should not detect Zoom when disabled
    (appDetector as any).triggerAppChange('zoom');
    
    expect(detector.getState()).toEqual({
      isInMeeting: false,
      appName: null,
      startTime: null
    });
  });
});