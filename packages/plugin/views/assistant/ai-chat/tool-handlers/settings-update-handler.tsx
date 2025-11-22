import React from 'react';
import { usePlugin } from '../../provider';

interface SettingUpdateProps {
  setting: string;
  value: string;
  onValidate: () => void;
  isValidated: boolean;
}

const SettingUpdate = ({ setting, value, onValidate, isValidated }: SettingUpdateProps) => (
  <div className="flex items-center justify-between p-2 border border-[--background-modifier-border] mb-2">
    <div className="flex-1">
      <div className="font-medium text-[--text-normal]">{setting}</div>
      <div className="text-sm text-[--text-muted] break-all">{value}</div>
    </div>
    <button
      onClick={onValidate}
      disabled={isValidated}
      className={`ml-2 px-3 py-1  ${
        isValidated 
          ? 'bg-[--interactive-accent] text-[--text-on-accent]' 
          : 'bg-[--interactive-normal] hover:bg-[--interactive-hover] text-[--text-normal]'
      }`}
    >
      {isValidated ? 'Applied' : 'Apply'}
    </button>
  </div>
);

export function SettingsUpdateHandler({
  toolInvocation,
  handleAddResult,
}: {
  toolInvocation: any;
  handleAddResult: (result: string) => void;
}) {
  const plugin = usePlugin();
  const [validatedSettings, setValidatedSettings] = React.useState<Set<string>>(new Set());

  const settings = toolInvocation.args;

  const updateSetting = async (key: string, value: string) => {
    try {
      plugin.settings[key] = value;
      await plugin.saveSettings();
      setValidatedSettings(prev => new Set([...prev, key]));
      
      if (validatedSettings.size + 1 === Object.keys(settings).length) {
        handleAddResult(JSON.stringify({ success: true, message: 'All settings updated successfully' }));
      }
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-[--text-normal] mb-2">
        Review and apply the suggested settings:
      </div>
      {Object.entries(settings).map(([key, value]) => (
        <SettingUpdate
          key={key}
          setting={key}
          value={value as string}
          onValidate={() => updateSetting(key, value as string)}
          isValidated={validatedSettings.has(key)}
        />
      ))}
    </div>
  );
} 