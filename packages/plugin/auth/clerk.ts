import { requestUrl, RequestUrlResponse } from "obsidian";
import { logger } from "../services/logger";
import { verifyJwtToken, DecodedToken } from "./jwt-verification";

export interface ClerkAuthResponse {
  token: string;
  userId: string;
  expiresAt: number;
}

export async function signInWithClerk(
  serverUrl: string,
  email: string,
  password: string
): Promise<ClerkAuthResponse | null> {
  try {
    console.log(`Attempting to sign in with Clerk at ${serverUrl}/api/auth/sign-in`);
    
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/sign-in`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    
    console.log("Clerk sign-in response status:", response.status);
    console.log("Clerk sign-in response data:", response.json);
    
    // Check if the response contains a valid token and userId
    if (response.status === 200 && response.json && response.json.token && response.json.userId) {
      console.log("Clerk authentication successful - valid token received");
      return response.json;
    }
    
    // If we got a 200 status but no valid token, it might be the development mode fallback
    if (response.status === 200 && (!response.json.token || !response.json.userId)) {
      console.warn("Received 200 status but invalid or missing token/userId - possible dev mode response");
      
      // Check if this is explicitly a development mode response
      if (response.json.message === "Development mode") {
        console.log("Development mode detected, creating synthetic token");
        // Create a synthetic token for development mode
        return {
          token: "dev-token",
          userId: response.json.userId || "dev-user",
          expiresAt: Date.now() + 3600000 // 1 hour from now
        };
      } else {
        console.error("Authentication response missing required fields:", response.json);
        throw new Error("Invalid authentication response");
      }
    }
    
    // Handle error responses with proper error messages
    if (response.json && response.json.error) {
      console.error("Clerk authentication error:", response.json.error);
      throw new Error(response.json.error);
    } else {
      console.error("Clerk authentication failed with status:", response.status);
      throw new Error(`Authentication failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("Error signing in with Clerk:", error);
    logger.error("Error signing in with Clerk:", error);
    
    // Re-throw the error with a more user-friendly message if it's a network error
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        throw new Error("Could not connect to authentication server. Please check your internet connection.");
      }
      throw error;
    }
    
    throw new Error("Authentication failed. Please try again later.");
  }
}

export async function refreshClerkToken(
  serverUrl: string,
  token: string,
  publicKey?: string
): Promise<ClerkAuthResponse | null> {
  try {
    // First try to verify the token locally if a public key is provided
    if (publicKey) {
      const decoded = await verifyJwtToken(token, publicKey);
      
      // If token is still valid, no need to refresh
      if (decoded) {
        logger.info("Token is still valid, no need to refresh");
        return {
          token,
          userId: decoded.userId,
          expiresAt: decoded.exp * 1000 // Convert to milliseconds
        };
      }
    }
    
    // If local verification fails or public key is not set, try server refresh
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/refresh`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (response.status === 200) {
      return response.json;
    }
    return null;
  } catch (error) {
    logger.error("Error refreshing Clerk token:", error);
    return null;
  }
}

export async function isClerkTokenValid(
  serverUrl: string,
  token: string,
  publicKey?: string
): Promise<boolean> {
  try {
    // First try to verify the token locally if a public key is provided
    if (publicKey) {
      const decoded = await verifyJwtToken(token, publicKey);
      
      if (decoded) {
        logger.info("Token verified locally");
        return true;
      }
    }
    
    // If local verification fails or public key is not set, try server validation
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/validate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    
    return response.status === 200;
  } catch (error) {
    logger.error("Error validating Clerk token:", error);
    return false;
  }
}
