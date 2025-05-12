import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/button";
import FileOrganizer from "../../../index";
import { Notice } from "obsidian";
import { StyledContainer } from "../../../components/ui/utils";
import { tw } from "../../../lib/utils";

interface OnboardingWizardProps {
  plugin: FileOrganizer;
  onComplete: () => void;
}

export function OnboardingWizard({ plugin, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignup, setIsSignup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const endpoint = isSignup ? "/api/sign-up" : "/api/sign-in";
      const response = await fetch(`${plugin.getServerUrl()}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!data.success || !data.licenseKey) {
        setError(data.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      // Set the license key
      plugin.settings.API_KEY = data.licenseKey;
      await plugin.saveSettings();
      
      // Show success message
      new Notice(`Successfully ${isSignup ? "signed up" : "signed in"}! Your account is now connected.`, 5000);
      
      // Move to next step
      nextStep();
    } catch (error) {
      console.error(`Error during ${isSignup ? "signup" : "login"}:`, error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);

  const finish = async () => {
    // Create necessary folders
    await plugin.checkAndCreateRequiredFolders();
    
    // Mark onboarding as complete
    plugin.settings.hasRunOnboarding = true;
    await plugin.saveSettings();
    
    onComplete();
  };

  const skipAccount = () => {
    nextStep();
  };

  return (
    <StyledContainer>
      <motion.div
        className={tw("max-w-xl mx-auto bg-white rounded-lg shadow-md p-6")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className={tw("text-xl font-bold mb-6 text-[--text-accent]")}>
          {step === 0
            ? "Welcome to Note Companion!"
            : step === 1
            ? "Create Your Account"
            : "Set Up Your Workspace"}
        </h2>

        {step === 0 && (
          <div className={tw("mb-6 space-y-4")}>
            <p className={tw("text-[--text-normal]")}>
              Note Companion helps you organize your Obsidian vault with AI-powered features:
            </p>
            <ul className={tw("list-disc pl-5 space-y-2")}>
              <li>Automatically organize and format notes</li>
              <li>Extract key concepts and suggest tags</li>
              <li>Get AI assistance with your content</li>
              <li>Sync across devices</li>
            </ul>
            <p className={tw("text-sm text-[--text-muted] mt-4")}>
              Let's get you set up in just a few steps!
            </p>
            <Button
              onClick={nextStep}
              className={tw("w-full mt-4")}
            >
              Get Started
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className={tw("mb-6 space-y-4")}>
            <div className={tw("mb-4 flex items-center justify-center space-x-4")}>
              <div
                className={tw(`cursor-pointer px-4 py-2 font-medium ${
                  isSignup 
                    ? "text-[--text-accent] border-b-2 border-[--text-accent]" 
                    : "text-[--text-muted]"
                }`)}
                onClick={() => setIsSignup(true)}
              >
                Sign Up
              </div>
              <div
                className={tw(`cursor-pointer px-4 py-2 font-medium ${
                  !isSignup 
                    ? "text-[--text-accent] border-b-2 border-[--text-accent]" 
                    : "text-[--text-muted]"
                }`)}
                onClick={() => setIsSignup(false)}
              >
                Sign In
              </div>
            </div>
            
            {error && (
              <div className={tw("bg-red-50 text-red-700 p-3 rounded-md text-sm")}>
                {error}
                <div className={tw("mt-2 text-xs text-gray-600")}>
                  Need help? Contact us at <a href="mailto:ben@notecompanion.ai" className={tw("text-blue-600 hover:underline")}>ben@notecompanion.ai</a>
                </div>
              </div>
            )}
            
            <div>
              <label className={tw("block text-[--text-normal] mb-1 text-sm font-medium")}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={tw("w-full bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2")}
              />
            </div>
            
            <div>
              <label className={tw("block text-[--text-normal] mb-1 text-sm font-medium")}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={tw("w-full bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2")}
              />
            </div>
            
            {isSignup && (
              <div>
                <label className={tw("block text-[--text-normal] mb-1 text-sm font-medium")}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={tw("w-full bg-[--background-primary] border border-[--background-modifier-border] rounded px-3 py-2")}
                />
              </div>
            )}
            
            <Button
              onClick={handleSignup}
              disabled={isLoading}
              className={tw("w-full mt-2")}
            >
              {isLoading ? (
                <span className={tw("flex items-center justify-center")}>
                  <svg className={tw("animate-spin -ml-1 mr-2 h-4 w-4")} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className={tw("opacity-25")} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className={tw("opacity-75")} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                isSignup ? "Sign Up" : "Sign In"
              )}
            </Button>
            
            <div className={tw("flex items-center justify-center my-4")}>
              <div className={tw("flex-grow border-t border-[--background-modifier-border]")}></div>
              <span className={tw("mx-4 text-[--text-muted] text-sm")}>or</span>
              <div className={tw("flex-grow border-t border-[--background-modifier-border]")}></div>
            </div>
            
            <Button 
              onClick={skipAccount}
              variant="outline"
              className={tw("w-full")}
            >
              Skip for now
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className={tw("mb-6 space-y-4")}>
            <div className={tw("mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4")}>
              <svg className={tw("w-8 h-8 text-green-600")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h4 className={tw("text-lg font-medium text-center")}>You're ready to go!</h4>
            
            <p className={tw("text-center")}>
              Note Companion is now set up and ready to help you organize your vault.
            </p>
            
            <div className={tw("bg-[--background-primary-alt] p-4 rounded-lg border border-[--background-modifier-border]")}>
              <h4 className={tw("font-medium text-sm mb-2")}>We'll create these folders for you:</h4>
              <ul className={tw("text-sm space-y-2")}>
                <li><strong>_NoteCompanion/Inbox</strong>: Files waiting to be processed</li>
                <li><strong>_NoteCompanion/Processed</strong>: Organized files</li>
                <li><strong>_NoteCompanion/References</strong>: Reference materials</li>
              </ul>
            </div>
            
            <Button
              onClick={finish}
              className={tw("w-full mt-4")}
            >
              Finish Setup
            </Button>
          </div>
        )}

        {/* Progress indicator */}
        <div className={tw("mt-6")}>
          <div className={tw("w-full bg-[--background-modifier-border] rounded-full h-1.5")}>
            <div
              className={tw("bg-[--text-accent] h-1.5 rounded-full")}
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            />
          </div>
          <div className={tw("text-xs text-[--text-muted] text-right mt-1")}>
            Step {step + 1} of 3
          </div>
        </div>
      </motion.div>
    </StyledContainer>
  );
}  