import NotificationService from './notification-service';
import { toast } from '@/components/ui/use-toast';

// Mock the toast component
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn()
}));

// Mock window.location
const mockLocation = {
  href: ''
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('NotificationService', () => {
  let notificationService: typeof NotificationService;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (NotificationService as any).instance = null;
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  it('should create a singleton instance', () => {
    const instance1 = NotificationService.getInstance();
    const instance2 = NotificationService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should show meeting notification with default values', () => {
    const service = NotificationService.getInstance();
    service.showMeetingNotification();

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Meeting Detected',
      description: expect.stringContaining('Would you like to take notes for this meeting?'),
      action: expect.objectContaining({
        label: 'Open in Obsidian'
      }),
      duration: 10000
    }));
  });

  it('should show meeting notification with provided meeting info', () => {
    const service = NotificationService.getInstance();
    const meetingInfo = {
      appName: 'Zoom',
      startTime: Date.now()
    };

    service.showMeetingNotification(meetingInfo);

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('Zoom')
    }));
  });

  it('should open Obsidian with correct deep link', () => {
    const service = NotificationService.getInstance();
    service.showMeetingNotification();

    // Simulate clicking the notification action
    const toastCall = (toast as jest.Mock).mock.calls[0][0];
    toastCall.action.onClick();

    // Verify the deep link format
    expect(mockLocation.href).toMatch(/^obsidian:\/\/new\?name=Meeting%20Notes%20\d{4}-\d{2}-\d{2}/);
  });

  it('should update configuration', () => {
    const service = NotificationService.getInstance();
    const newConfig = {
      obsidianDeepLink: 'obsidian://custom',
      notificationTitle: 'Custom Title',
      notificationBody: 'Custom Body',
      actionLabel: 'Custom Action'
    };

    service.updateConfig(newConfig);
    service.showMeetingNotification();

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Custom Title',
      description: expect.stringContaining('Custom Body'),
      action: expect.objectContaining({
        label: 'Custom Action'
      })
    }));

    // Verify custom deep link
    const toastCall = (toast as jest.Mock).mock.calls[0][0];
    toastCall.action.onClick();
    expect(mockLocation.href).toContain('obsidian://custom');
  });
});