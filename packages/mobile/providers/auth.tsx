import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import Constants from 'expo-constants';

// Enhanced token cache with longer expiration and error logging
const tokenCache = {
  async getToken(key: string) {
    try {
      console.log(`[TokenCache] Retrieving token for key: ${key}`);
      const token = await SecureStore.getItemAsync(key);
      console.log(`[TokenCache] Token ${token ? 'found' : 'not found'} for key: ${key}`);
      return token;
    } catch (err) {
      console.error(`[TokenCache] Error retrieving token for key ${key}:`, err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      console.log(`[TokenCache] Saving token for key: ${key}`);
      // Setting tokens with no expiration to improve persistence
      return SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.ALWAYS
      });
    } catch (err) {
      console.error(`[TokenCache] Error saving token for key ${key}:`, err);
      return;
    }
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = Constants.expoConfig?.extra?.clerkPublishableKey as string;

  if (!publishableKey) {
    throw new Error("Missing Clerk Publishable Key");
  }

  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      // Add longer session duration (30 days in seconds)
      sessionTimeoutMs={30 * 24 * 60 * 60 * 1000}
    >
      {children}
    </ClerkProvider>
  );
}

// Re-export useAuth for convenience
export { useAuth }; 