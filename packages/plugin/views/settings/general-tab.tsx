import React, { useState, useEffect } from "react";
import { Notice } from "obsidian";
import FileOrganizer from "../../index";
import { logger } from "../../services/logger";
import { UsageStats } from "../../components/usage-stats";
import { TopUpCredits } from '../../views/settings/top-up-credits';
import { AccountData } from './account-data';

interface GeneralTabProps {
  plugin: FileOrganizer;
  userId: string;
  email: string;
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
  const [clerkEmail, setClerkEmail] = useState(plugin.settings.CLERK_EMAIL || "");
  const [clerkPassword, setClerkPassword] = useState(plugin.settings.CLERK_PASSWORD || "");
  const [authStatus, setAuthStatus] = useState<'authenticated' | 'unauthenticated' | 'loading'>(
    plugin.settings.CLERK_SESSION_TOKEN ? 'authenticated' : 'unauthenticated'
  );
  const [authError, setAuthError] = useState<string | null>(null);

  // Check key status on mount if we have a key
  useEffect(() => {
    if (plugin.settings.API_KEY) {
      checkLicenseStatus();
    }
  }, []);

  const checkLicenseStatus = async () => {
    if (!licenseKey) return;
    setKeyStatus('checking');
    console.log("Checking license status for key:", licenseKey ? "********" : "empty");
    const isValid = await plugin.isLicenseKeyValid(licenseKey);
    setKeyStatus(isValid ? 'valid' : 'invalid');
    console.log("License status check result:", isValid ? "valid" : "invalid", 
      isValid ? "" : `(Error: ${plugin.settings.licenseErrorMessage})`);
  };

  const handleLicenseKeyChange = async (value: string) => {
    setLicenseKey(value);
    setKeyStatus('idle');
    plugin.settings.API_KEY = value;
    await plugin.saveSettings();
    console.log("License key updated, status set to idle");
  };

  const handleActivate = async () => {
    setKeyStatus('checking');
    console.log("Activating license key...");
    const isValid = await plugin.isLicenseKeyValid(licenseKey);
    setKeyStatus(isValid ? 'valid' : 'invalid');
    
    // Show a notice to the user
    if (isValid) {
      console.log("License key activated successfully");
      new Notice("License key activated successfully", 3000);
    } else {
      const errorMessage = plugin.settings.licenseErrorMessage || "Please check and try again.";
      console.error(`License key activation failed: ${errorMessage}`);
      new Notice(`Invalid license key: ${errorMessage}`, 3000);
    }
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
      <div className="bg-[--background-primary-alt] p-4 rounded-lg">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 mt-0">File Organizer Authentication</h3>
            <p className="text-[--text-muted] mb-4">
              Sign in with your File Organizer account or enter your license key.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium mb-2 mt-0">Sign in with your account</h4>
              <div className="space-y-2">
                <input
                  type="email"
                  className="w-full bg-[--background-primary] border rounded px-3 py-1.5 border-[--background-modifier-border]"
                  placeholder="Email"
                  value={clerkEmail}
                  onChange={e => {
                    setClerkEmail(e.target.value);
                    plugin.settings.CLERK_EMAIL = e.target.value;
                    plugin.saveSettings();
                  }}
                />
                <input
                  type="password"
                  className="w-full bg-[--background-primary] border rounded px-3 py-1.5 border-[--background-modifier-border]"
                  placeholder="Password"
                  value={clerkPassword}
                  onChange={e => {
                    setClerkPassword(e.target.value);
                    plugin.settings.CLERK_PASSWORD = e.target.value;
                    plugin.saveSettings();
                  }}
                />
                <div className="space-y-2">
                  <h4 className="font-medium mb-2 mt-0">Clerk Public Key</h4>
                  <textarea
                    placeholder="Enter your Clerk Public Key (PEM format)"
                    value={plugin.settings.CLERK_PUBLIC_KEY}
                    onChange={e => {
                      plugin.settings.CLERK_PUBLIC_KEY = e.target.value;
                      plugin.saveSettings();
                    }}
                    className="w-full h-32 bg-[--background-primary] border rounded px-3 py-1.5 border-[--background-modifier-border]"
                  />
                  <p className="text-sm text-[--text-muted]">
                    This is used for JWT verification. You can find this in your Clerk Dashboard under API Keys.
                  </p>
                </div>
                <button 
                  onClick={async () => {
                    // Validate inputs first
                    if (!clerkEmail || !clerkEmail.includes('@')) {
                      setAuthError("Please enter a valid email address");
                      new Notice("Please enter a valid email address", 3000);
                      return;
                    }
                    
                    if (!clerkPassword || clerkPassword.length < 6) {
                      setAuthError("Password must be at least 6 characters");
                      new Notice("Password must be at least 6 characters", 3000);
                      return;
                    }
                    
                    setAuthStatus('loading');
                    setAuthError(null);
                    plugin.settings.CLERK_EMAIL = clerkEmail;
                    plugin.settings.CLERK_PASSWORD = clerkPassword;
                    await plugin.saveSettings();
                    
                    console.log("Attempting to sign in with Clerk...");
                    try {
                      // Check if we're using a test server
                      const isTestServer = plugin.getServerUrl().includes('vercel.app') || 
                                          plugin.getServerUrl().includes('localhost');
                      
                      if (isTestServer) {
                        console.warn("Using test server - authentication may be automatically approved");
                      }
                      
                      const auth = await plugin.signInWithClerk(clerkEmail, clerkPassword);
                      console.log("Clerk authentication result:", auth ? "success" : "failed");
                      
                      if (auth) {
                        setAuthStatus('authenticated');
                        new Notice("Signed in successfully", 3000);
                      } else {
                        setAuthStatus('unauthenticated');
                        const errorMsg = "Authentication failed. Please check your credentials.";
                        setAuthError(errorMsg);
                        new Notice(errorMsg, 3000);
                      }
                    } catch (error) {
                      console.error("Error during Clerk authentication:", error);
                      setAuthStatus('unauthenticated');
                      const errorMsg = error instanceof Error ? error.message : "Unknown authentication error";
                      setAuthError(errorMsg);
                      new Notice(`Authentication error: ${errorMsg}`, 3000);
                    }
                  }}
                  className="w-full bg-[--interactive-accent] text-[--text-on-accent] px-4 py-1.5 rounded hover:bg-[--interactive-accent-hover] transition-colors"
                  disabled={authStatus === 'loading'}
                >
                  {authStatus === 'loading' ? 'Signing in...' : 'Sign in'}
                </button>
                {authStatus === 'authenticated' && (
                  <div className="flex items-center text-[--text-success] text-sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Signed in successfully
                  </div>
                )}
                {authStatus === 'unauthenticated' && authError && (
                  <div className="flex items-center text-[--text-error] text-sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {authError}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center text-[--text-muted]">
              <span>Or</span>
            </div>
            
            {/* License key input */}
            <div className="space-y-2">
              <h4 className="font-medium mb-2 mt-0">Use a license key</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`flex-1 bg-[--background-primary] border rounded px-3 py-1.5 ${keyStatus === 'valid' ? 'border-[--text-success]' : 
                    keyStatus === 'invalid' ? 'border-[--text-error]' : 
                    'border-[--background-modifier-border]'}`}
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
          <a
            href="https://fileorganizer2000.com/?utm_source=obsidian&utm_medium=in-app&utm_campaign=support-us"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[--text-accent] hover:text-[--text-accent-hover]"
          >
            consider supporting us
          </a>
          {" "}to help improve and maintain the project. Thank you!
        </p>
        <p className="text-[--text-muted]">
          <a
            href="https://discord.gg/UWH53WqFuE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[--text-accent] hover:text-[--text-accent-hover]"
          >
            Need help? Ask me on Discord.
          </a>
        </p>
      </div>
    </div>
  );
};
