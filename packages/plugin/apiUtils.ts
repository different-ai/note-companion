import { Notice, RequestUrlResponse, requestUrl } from "obsidian";
import { logMessage } from "./someUtils";
import { logger } from "./services/logger";
import { verifyJwtToken } from "./auth/jwt-verification";

export async function makeApiRequest<T>(
  requestFn: () => Promise<RequestUrlResponse>
): Promise<RequestUrlResponse> {
  logMessage("Making API request", requestFn);
  const response: RequestUrlResponse = await requestFn();
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  if (response.json.error) {
    new Notice(`File Organizer error: ${response.json.error}`, 6000);
    throw new Error(response.json.error);
  }
  throw new Error("Unknown error");
}

export async function checkLicenseKey(
  serverUrl: string,
  key: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  try {
    console.log(`Checking license key at ${serverUrl}/api/check-key`);
    
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/check-key`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
    });
    
    console.log("License check response status:", response.status);
    console.log("License check response data:", response.json);
    
    if (response.status === 200) {
      // Check if the response contains a valid message
      const validMessages = ["Valid key", "Valid session", "Development mode"];
      if (response.json && response.json.message && validMessages.includes(response.json.message)) {
        console.log(`License key valid with message: ${response.json.message}`);
        return { isValid: true };
      } else {
        console.error("License key response not recognized:", response.json);
        return { 
          isValid: false, 
          errorMessage: response.json?.error || "Invalid license key response" 
        };
      }
    } else {
      console.error("License key check failed with status:", response.status);
      return { 
        isValid: false, 
        errorMessage: response.json?.error || "Invalid license key" 
      };
    }
  } catch (error) {
    console.error("Error checking API key:", error);
    logger.error("Error checking API key:", error);
    return { 
      isValid: false, 
      errorMessage: error instanceof Error ? error.message : "Failed to validate license key" 
    };
  }
}

export async function checkClerkAuth(
  serverUrl: string,
  token: string
): Promise<boolean> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/validate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.status === 200;
  } catch (error) {
    logger.error("Error checking Clerk authentication:", error);
    return false;
  }
}

export async function refreshClerkToken(
  serverUrl: string,
  token: string
): Promise<{ token: string } | null> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/refresh`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.status === 200 && response.json?.token) {
      logger.info("Successfully refreshed Clerk token");
      return { token: response.json.token };
    }
    
    logger.error(`Failed to refresh token: ${response.status}`);
    return null;
  } catch (error) {
    logger.error("Error refreshing Clerk token:", error);
    return null;
  }
}

export async function isClerkTokenValid(
  serverUrl: string,
  token: string
): Promise<boolean> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/validate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.status === 200;
  } catch (error) {
    logger.error("Error validating Clerk token:", error);
    return false;
  }
}

export async function handleAuthenticatedRequest<T>(
  requestFn: () => Promise<T>,
  plugin: any, // FileOrganizer instance
  retryCount = 0
): Promise<T> {
  try {
    // Attempt the API call
    return await requestFn();
  } catch (error: any) {
    // Check if it's an authentication error (401 Unauthorized)
    if (
      error.message?.includes("401") ||
      error.message?.includes("Unauthorized") ||
      error.status === 401
    ) {
      logger.error("Authentication error detected:", error);
      
      // If we're using Clerk authentication and haven't exceeded retry attempts
      if (plugin.settings.CLERK_SESSION_TOKEN && retryCount < 1) {
        logger.info("Attempting to refresh Clerk token");
        
        // First try to verify the token locally
        if (plugin.settings.CLERK_PUBLIC_KEY) {
          const decoded = await verifyJwtToken(
            plugin.settings.CLERK_SESSION_TOKEN,
            plugin.settings.CLERK_PUBLIC_KEY
          );
          
          // If token is invalid, try to refresh it
          if (!decoded) {
            logger.info("Token is invalid, attempting to refresh");
            const refreshed = await plugin.refreshClerkToken();
            
            if (refreshed) {
              logger.info("Token refreshed successfully, retrying request");
              // Retry the request with the new token
              return await handleAuthenticatedRequest(requestFn, plugin, retryCount + 1);
            } else {
              logger.error("Failed to refresh token, authentication may have expired");
              // Show a notice to the user that they need to re-authenticate
              new Notice("Your session has expired. Please sign in again.", 5000);
            }
          } else {
            logger.info("Token is valid but request failed, retrying with same token");
            // Token is valid but request failed for other reasons, retry once
            return await handleAuthenticatedRequest(requestFn, plugin, retryCount + 1);
          }
        } else {
          // No public key set, fall back to server-side refresh
          const refreshed = await plugin.refreshClerkToken();
          
          if (refreshed) {
            logger.info("Token refreshed successfully, retrying request");
            // Retry the request with the new token
            return await handleAuthenticatedRequest(requestFn, plugin, retryCount + 1);
          } else {
            logger.error("Failed to refresh token, authentication may have expired");
            // Show a notice to the user that they need to re-authenticate
            new Notice("Your session has expired. Please sign in again.", 5000);
          }
        }
      }
    }
    
    // Re-throw the error for other error types or if token refresh failed
    throw error;
  }
}
