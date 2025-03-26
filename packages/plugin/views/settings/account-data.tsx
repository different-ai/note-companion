import React, { useState, useEffect, useCallback } from 'react';
import { UsageStats } from '../../components/usage-stats';
import { TopUpCredits } from './top-up-credits';
import { logger } from '../../services/logger';
import FileOrganizer from '../../index';
import { Notice } from 'obsidian';

interface AccountDataProps {
  plugin: FileOrganizer;
  onLicenseKeyChange: (key: string) => void;
}

interface UsageData {
  tokenUsage: number;
  maxTokenUsage: number;
  subscriptionStatus: string;
  currentPlan: string;
}

interface SignupResponse {
  success: boolean;
  licenseKey?: string;
  error?: string;
}

export const AccountData: React.FC<AccountDataProps> = ({ plugin, onLicenseKeyChange }) => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignup, setIsSignup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDevMode, setIsDevMode] = useState(false);
  const [devTokens, setDevTokens] = useState('1000000');

  useEffect(() => {
    // Check if in development mode
    const checkDevMode = async () => {
      try {
        const response = await fetch(`${plugin.getServerUrl()}/api/health`);
        const data = await response.json();
        setIsDevMode(data.environment === 'development');
      } catch (error) {
        console.log('Error checking environment:', error);
        setIsDevMode(false);
      }
    };
    
    checkDevMode();
  }, [plugin]);

  const fetchUsageData = useCallback(async () => {
    try {
      if (!plugin.settings.API_KEY) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${plugin.getServerUrl()}/api/usage`, {
        headers: {
          Authorization: `Bearer ${plugin.settings.API_KEY}`,
        },
      });
      
      if (response.status === 429) {
        try {
          const data = await response.json();
          if (data && typeof data === 'object') {
            setUsageData(data);
            
            if (data.isTokenLimitError) {
              plugin.settings.isTokenLimitReached = true;
              await plugin.saveSettings();
            }
          }
        } catch (e) {
          logger.error('Error parsing token limit response:', e);
        }
        setLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch usage data');
      
      const data = await response.json();
      setUsageData(data);
    } catch (error) {
      logger.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [plugin]);

  useEffect(() => {
    fetchUsageData();

    const intervalId = setInterval(fetchUsageData, 3000);

    return () => clearInterval(intervalId);
  }, [fetchUsageData]);

  const handleSignup = async () => {
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isSignup ? '/api/sign-up' : '/api/sign-in';
      const response = await fetch(`${plugin.getServerUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: SignupResponse = await response.json();
      
      if (!data.success || !data.licenseKey) {
        setError(data.error || 'Authentication failed');
        return;
      }

      // Set the license key
      onLicenseKeyChange(data.licenseKey);
      
      // Show success message
      new Notice(`Successfully ${isSignup ? 'signed up' : 'signed in'}! Your account is now connected.`, 5000);
      
    } catch (error) {
      logger.error(`Error during ${isSignup ? 'signup' : 'login'}:`, error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevTopUp = async () => {
    try {
      setIsLoading(true);
      const tokens = parseInt(devTokens);
      
      if (isNaN(tokens) || tokens <= 0) {
        setError('Please enter a valid number of tokens');
        return;
      }
      
      const response = await fetch(`${plugin.getServerUrl()}/api/top-up?tokens=${tokens}`, {
        headers: {
          'Authorization': `Bearer ${plugin.settings.API_KEY}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        new Notice(`Successfully added ${tokens.toLocaleString()} tokens to your account!`, 5000);
        fetchUsageData();
      } else {
        setError(data.error || 'Failed to add tokens');
      }
    } catch (error) {
      setError('An error occurred while adding tokens');
    } finally {
      setIsLoading(false);
    }
  };

  if (!plugin.settings.API_KEY) {
    return (
      <div className="bg-[--background-primary-alt] p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2 mt-0">Get Started with Note Companion</h3>
        <p className="text-[--text-muted] mb-4">
          Create an account or sign in to access all features.
        </p>

        <div className="mb-4 flex items-center justify-center space-x-4">
          <div
            className={`cursor-pointer px-4 py-2 font-medium ${
              isSignup 
                ? 'text-[--text-accent] border-b-2 border-[--text-accent]' 
                : 'text-[--text-muted]'
            }`}
            onClick={() => setIsSignup(true)}
          >
            Sign Up
          </div>
          <div
            className={`cursor-pointer px-4 py-2 font-medium ${
              !isSignup 
                ? 'text-[--text-accent] border-b-2 border-[--text-accent]' 
                : 'text-[--text-muted]'
            }`}
            onClick={() => setIsSignup(false)}
          >
            Sign In
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-[--text-normal] mb-1 text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-[--text-normal] mb-1 text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2"
            />
          </div>
          
          {isSignup && (
            <div>
              <label className="block text-[--text-normal] mb-1 text-sm font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2"
              />
            </div>
          )}
          
          <button
            onClick={handleSignup}
            disabled={isLoading}
            className="w-full bg-[--interactive-accent] text-[--text-on-accent] py-2 rounded-md font-medium hover:bg-[--interactive-accent-hover] transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              isSignup ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="flex-grow border-t border-[--background-modifier-border]"></div>
          <span className="mx-4 text-[--text-muted] text-sm">or</span>
          <div className="flex-grow border-t border-[--background-modifier-border]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Quick Account Creation */}
          <div className="bg-[--background-primary] p-4 rounded-lg border border-[--background-modifier-border] flex flex-col">
            <div className="flex-1">
              <h4 className="font-medium mb-2 mt-0">Create Account via Web</h4>
              <p className="text-[--text-muted] text-sm">
                Create an account through our web dashboard for a full-featured experience.
              </p>
            </div>
            <div 
              onClick={() => window.open(plugin.getServerUrl(), '_blank')}
              className="mt-4 cursor-pointer bg-[--interactive-accent] text-[--text-on-accent] px-4 py-2 rounded hover:bg-[--interactive-accent-hover] transition-colors text-center font-medium"
            >
              Open Dashboard
            </div>
          </div>

          {/* Quick Top-up Option */}
          <div className="bg-[--background-primary] p-4 rounded-lg border border-[--background-modifier-border] flex flex-col">
            <div className="flex-1">
              <h4 className="font-medium mb-2 mt-0">Quick Top-up</h4>
              <p className="text-[--text-muted] text-sm">
                Start immediately with a one-time credit purchase. No account needed.
              </p>
            </div>
            <div className="mt-4">
              <TopUpCredits 
                plugin={plugin} 
                onLicenseKeyChange={onLicenseKeyChange} 
              />
            </div>
          </div>
        </div>

        {isDevMode && (
          <div className="bg-[--background-primary] p-4 rounded-lg border border-[--background-modifier-border] mt-4">
            <h4 className="font-medium mb-2 mt-0">Development Mode</h4>
            <p className="text-[--text-muted] text-sm mb-3">
              Add tokens to your account for development purposes.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={devTokens}
                onChange={(e) => setDevTokens(e.target.value)}
                className="flex-1 bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2"
                placeholder="Number of tokens"
              />
              <button
                onClick={handleDevTopUp}
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Tokens'}
              </button>
            </div>
          </div>
        )}

        <div className="text-[--text-muted] text-sm mt-6">
          <p className="mb-2">
            💡 <strong>Benefits of having an account:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Early access to new features</li>
            <li>Credit management dashboard</li>
            <li>Sync across devices</li>
            <li>Priority support</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {usageData && (
        <>
          <UsageStats usageData={usageData} />
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4 mt-0">Need more credits?</h3>
            <TopUpCredits plugin={plugin} onLicenseKeyChange={onLicenseKeyChange} />
          </div>
          
          {isDevMode && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4 mt-0">Development Tools</h3>
              <div className="bg-[--background-primary] p-4 rounded-lg border border-[--background-modifier-border]">
                <h4 className="font-medium mb-2 mt-0">Add Development Tokens</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={devTokens}
                    onChange={(e) => setDevTokens(e.target.value)}
                    className="flex-1 bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2"
                    placeholder="Number of tokens"
                  />
                  <button
                    onClick={handleDevTopUp}
                    disabled={isLoading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Adding...' : 'Add Tokens'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};    