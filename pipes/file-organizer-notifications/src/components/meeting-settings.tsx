'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import MeetingDetector from '@/lib/services/meeting-detector';
import NotificationService from '@/lib/services/notification-service';

interface MeetingSettings {
  enableZoom: boolean;
  enableGoogleMeet: boolean;
  enableAudioDetection: boolean;
  notificationDuration: number;
  obsidianDeepLink: string;
}

export default function MeetingSettings() {
  const [settings, setSettings] = useState<MeetingSettings>({
    enableZoom: true,
    enableGoogleMeet: true,
    enableAudioDetection: true,
    notificationDuration: 10,
    obsidianDeepLink: 'obsidian://new'
  });

  const handleSettingChange = (key: keyof MeetingSettings, value: boolean | number | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Update services with new settings
    const meetingDetector = MeetingDetector.getInstance();
    const notificationService = NotificationService.getInstance();

    meetingDetector.updateConfig({
      enableZoom: newSettings.enableZoom,
      enableGoogleMeet: newSettings.enableGoogleMeet,
      enableAudioDetection: newSettings.enableAudioDetection,
      notificationDuration: newSettings.notificationDuration
    });

    notificationService.updateConfig({
      obsidianDeepLink: newSettings.obsidianDeepLink
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Meeting Detection Settings</CardTitle>
        <CardDescription>
          Configure how Note Companion detects meetings and integrates with Obsidian
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="zoom" className="flex flex-col space-y-1">
              <span>Zoom Detection</span>
              <span className="text-sm text-gray-500">Detect Zoom meetings automatically</span>
            </Label>
            <Switch
              id="zoom"
              checked={settings.enableZoom}
              onCheckedChange={(checked) => handleSettingChange('enableZoom', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="meet" className="flex flex-col space-y-1">
              <span>Google Meet Detection</span>
              <span className="text-sm text-gray-500">Detect Google Meet sessions automatically</span>
            </Label>
            <Switch
              id="meet"
              checked={settings.enableGoogleMeet}
              onCheckedChange={(checked) => handleSettingChange('enableGoogleMeet', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="audio" className="flex flex-col space-y-1">
              <span>Audio Detection</span>
              <span className="text-sm text-gray-500">Use audio patterns to detect meetings</span>
            </Label>
            <Switch
              id="audio"
              checked={settings.enableAudioDetection}
              onCheckedChange={(checked) => handleSettingChange('enableAudioDetection', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="flex flex-col space-y-1">
              <span>Notification Duration</span>
              <span className="text-sm text-gray-500">How long to show notifications (in seconds)</span>
            </Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={60}
              value={settings.notificationDuration}
              onChange={(e) => handleSettingChange('notificationDuration', parseInt(e.target.value, 10))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deeplink" className="flex flex-col space-y-1">
              <span>Obsidian Deep Link</span>
              <span className="text-sm text-gray-500">URL scheme for creating notes in Obsidian</span>
            </Label>
            <Input
              id="deeplink"
              type="text"
              value={settings.obsidianDeepLink}
              onChange={(e) => handleSettingChange('obsidianDeepLink', e.target.value)}
              placeholder="obsidian://new"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}