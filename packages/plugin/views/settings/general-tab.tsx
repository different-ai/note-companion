import React, { useState, useEffect } from "react";
import { Notice } from "obsidian";
import FileOrganizer from "../../index";
import { logger } from "../../services/logger";
import { UsageStats } from "../../components/usage-stats";
import { TopUpCredits } from '../../views/settings/top-up-credits';
import { AccountData } from './account-data';

interface GeneralTabProps {
  plugin: FileOrganizer;
}

interface UsageData {
  tokenUsage: number;
  maxTokenUsage: number;
  subscriptionStatus: string;
  currentPlan: string;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ plugin, userId, email }) => {
  const [licenseKey, setLicenseKey] = useState(plugin.settings.API_KEY);
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | 'checking' | 'idle'>(
    plugin.settings.API_KEY ? 'checking' : 'idle'
  );

  // Check key status on mount if we have a key
  useEffect(() => {
    if (plugin.settings.API_KEY) {
      checkLicenseStatus();
    }
  }, []);

  const checkLicenseStatus = async () => {
    if (!licenseKey) return;
    setKeyStatus('checking');
    const isValid = await plugin.isLicenseKeyValid(licenseKey);
    
    if (plugin.settings.isTokenLimitReached) {
      setKeyStatus('valid'); // Keep license valid but show warning UI
      logger.debug("Token limit reached, setting key status to valid with warning");
    } else {
      setKeyStatus(isValid ? 'valid' : 'invalid');
      logger.debug(`License key validation result: ${isValid ? 'valid' : 'invalid'}`);
    }
  };

  const handleLicenseKeyChange = async (value: string) => {
    setLicenseKey(value);
    setKeyStatus('idle');
    plugin.settings.API_KEY = value;
    await plugin.saveSettings();
  };

  const handleActivate = async () => {
    await checkLicenseStatus();
  };

  const getStatusIndicator = () => {
    switch (keyStatus) {
      case 'valid':
        return (
          <div className="flex items-center text-[--text-success] text-sm">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            License key activated
          </div>
        );
      case 'invalid':
        if (plugin.settings.isTokenLimitReached) {
          return (
            <div className="flex items-center text-[--text-warning] text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Token limit reached. Please upgrade your plan.
            </div>
          );
        }
        return (
          <div className="flex items-center text-[--text-error] text-sm">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Invalid license key
          </div>
        );
      case 'checking':
        return (
          <div className="flex items-center text-[--text-muted] text-sm">
            <svg className="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Checking license key...
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="file-organizer-settings space-y-6">
      {plugin.settings.isTokenLimitReached && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="font-medium">Token limit reached. Your license is still valid, but you need to upgrade your plan for more tokens.</div>
          </div>
          <div className="mt-3">
            <button 
              onClick={() => window.open("https://notecompanion.ai/pricing?utm_source=obsidian&utm_medium=in-app&utm_campaign=token-limit", "_blank")}
              className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      )}
      <div className="bg-[--background-primary-alt] p-4 rounded-lg">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 mt-0">Note Companion License Key</h3>
            <p className="text-[--text-muted] mb-4">
              Enter your license key to activate Note Companion.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                className={`flex-1 bg-[--background-primary] border rounded px-3 py-1.5 ${keyStatus === 'valid' ? 'border-[--text-success]' : 
                  (plugin.settings.isTokenLimitReached ? 'border-[--text-warning]' : 
                  keyStatus === 'invalid' ? 'border-[--text-error]' : 
                  'border-[--background-modifier-border]')}`}
                placeholder="Enter your File Organizer License Key"
                value={licenseKey}
                onChange={e => handleLicenseKeyChange(e.target.value)}
              />
              <button 
                onClick={handleActivate}
                className="bg-[--interactive-accent] text-[--text-on-accent] px-4 py-1.5 rounded hover:bg-[--interactive-accent-hover] transition-colors"
              >
                Activate
              </button>
            </div>
            {getStatusIndicator()}
          </div>
        </div>
      </div>

      <div className="bg-[--background-primary-alt] p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4 mt-0">Quick Tutorial</h3>
        <div className="youtube-embed">
          <iframe
            width="100%"
            height="315"
            src="https://www.youtube.com/embed/X4yN4ykTJIo?si=QoMN-wNZSo1woQcB"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>

      <AccountData 
        plugin={plugin} 
        onLicenseKeyChange={handleLicenseKeyChange}
      />

      <div className="bg-[--background-primary-alt] p-4 rounded-lg">
        <p className="file-organizer-support-text mb-4">
          Note Companion is an open-source initiative developed by two
          brothers. If you find it valuable, please{" "}
          <button
            onClick={() => window.open("https://notecompanion.ai/?utm_source=obsidian&utm_medium=in-app&utm_campaign=support-us", "_blank")}
            className="text-[--text-accent] hover:text-[--text-accent-hover] inline bg-transparent border-none p-0 cursor-pointer"
          >
            consider supporting us
          </button>{" "}
          to help improve and maintain the project. 🙏
        </p>
        <p className="text-[--text-muted]">
          <button
            onClick={() => window.open("https://discord.gg/UWH53WqFuE", "_blank")}
            className="text-[--text-accent] hover:text-[--text-accent-hover] inline bg-transparent border-none p-0 cursor-pointer"
          >
            Need help? Ask me on Discord.
          </button>
        </p>
      </div>
    </div>
  );
};
