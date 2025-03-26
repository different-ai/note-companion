import { clerkClient, auth } from "@clerk/nextjs/server";
import { verifyKey } from "@unkey/api";
import { NextRequest } from "next/server";
import { checkTokenUsage, checkUserSubscriptionStatus, createEmptyUserUsage, UserUsageTable, db, initializeTierConfig } from "../drizzle/schema";
import PostHogClient from "./posthog";
import { eq } from "drizzle-orm";

/**
 * @deprecated This function is being deprecated in favor of a new authorization method.
 * Please use the new handleAuthorizationV2 function instead.
 */
async function handleLogging(
  req: NextRequest,
  userId: string,
  isCustomer: boolean
) {
  const authClient = await clerkClient();
  const user = await authClient.users.getUser(userId);
  const client = PostHogClient();
  if (client) {
    client.capture({
      distinctId: userId,
      event: "call-api",
      properties: {
        endpoint: req.nextUrl.pathname.replace("/api/", ""),
        isCustomer,
        email: user?.emailAddresses[0]?.emailAddress,
      },
    });
  }
}

async function handleLoggingV2(
  req: NextRequest,
  userId: string,
) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  console.log("user", user.emailAddresses[0]?.emailAddress);
  const posthogClient = PostHogClient();
  if (posthogClient) {
    posthogClient.capture({
      distinctId: userId,
      event: "call-api",
      properties: {
        endpoint: req.nextUrl.pathname.replace("/api/", ""),
        email: user?.emailAddresses[0]?.emailAddress,
      },
    });
  }
}

class AuthorizationError extends Error {
  status: number;
  isTokenLimitError?: boolean;
  userId?: string;

  constructor(message: string, status: number, isTokenLimitError: boolean = false, userId?: string) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
    this.isTokenLimitError = isTokenLimitError;
    this.userId = userId;
  }
}

export const getToken = (req: NextRequest) => {
  const header = req.headers.get("authorization");
  const token = header?.replace("Bearer ", "");
  return token;
};

// Make sure tier configurations exist
let tierConfigInitialized = false;
async function ensureTierConfigExists(): Promise<void> {
  if (tierConfigInitialized) return;
  
  try {
    await initializeTierConfig();
    tierConfigInitialized = true;
    console.log("Tier configuration initialized");
  } catch (error) {
    console.error("Error initializing tier configuration:", error);
  }
}

// Helper function to check if user exists and initialize if not
async function ensureUserExists(userId: string): Promise<boolean> {
  try {
    // Make sure tier configuration exists first
    await ensureTierConfigExists();
    
    // Check if user exists in the database
    const userUsage = await db
      .select()
      .from(UserUsageTable)
      .where(eq(UserUsageTable.userId, userId))
      .limit(1);
    
    // If no user record exists, create one with free tier
    if (!userUsage.length) {
      console.log(`User ${userId} not found in database, initializing with free tier`);
      await createEmptyUserUsage(userId);
      return true;
    }
    
    return true;
  } catch (error) {
    console.error("Error ensuring user exists:", error);
    return false;
  }
}

export async function handleAuthorizationV2(req: NextRequest) {
  // this is to allow people to self host it easily without
  // setting up clerk
  if (process.env.ENABLE_USER_MANAGEMENT !== "true") {
    return { userId: "user", isCustomer: true };
  }

  // First, try API key authentication
  const token = getToken(req);
  if (token) {
    try {
      const { result, error } = await verifyKey(token);
      if (result.valid) {
        // API key is valid
        console.log("API key authentication successful");
        
        // Ensure user exists in database
        await ensureUserExists(result.ownerId);
        
        // Check subscription status
        const isActive = await checkUserSubscriptionStatus(result.ownerId);
        if (!isActive) {
          throw new AuthorizationError("Subscription canceled or inactive", 403);
        }
        
        // Check token usage
        const { remaining, usageError } = await checkTokenUsage(result.ownerId);
        if (usageError) {
          throw new AuthorizationError("Error checking token usage", 500);
        }
        
        if (remaining <= 0) {
          throw new AuthorizationError(
            "Token limit exceeded. Please upgrade your plan for more tokens.",
            429,
            true, // Mark as token limit error
            result.ownerId // Include userId so we can still fetch usage data
          );
        }
        
        // Might require await
        handleLoggingV2(req, result.ownerId);
        return { userId: result.ownerId };
      }
    } catch (error) {
      console.error("API key validation error:", error);
      // Continue to try Clerk authentication if API key validation fails
    }
  }

  // If API key authentication failed or wasn't provided, try Clerk authentication
  try {
    const { userId } = await auth();
    if (userId) {
      console.log("Clerk authentication successful");
      
      // Ensure user exists in database
      await ensureUserExists(userId);
      
      // Check subscription status
      const isActive = await checkUserSubscriptionStatus(userId);
      if (!isActive) {
        throw new AuthorizationError("Subscription canceled or inactive", 403);
      }
      
      // Check token usage
      const { remaining, usageError } = await checkTokenUsage(userId);
      if (usageError) {
        throw new AuthorizationError("Error checking token usage", 500);
      }
      
      if (remaining <= 0) {
        throw new AuthorizationError(
          "Token limit exceeded. Please upgrade your plan for more tokens.",
          429,
          true, // Mark as token limit error
          userId // Include userId so we can still fetch usage data
        );
      }
      
      handleLoggingV2(req, userId);
      return { userId };
    }
  } catch (error) {
    console.error("Clerk authentication error:", error);
    // Authentication failed, will throw below
  }

  // If we reach here, both authentication methods failed
  throw new AuthorizationError("Unauthorized", 401);
}

/**
 * @deprecated This function is being deprecated in favor of a new authorization method.
 * Please use the new handleAuthorizationV2 function instead.
 */
export async function handleAuthorization(req: NextRequest) {
  // this is to allow people to self host it easily without
  // setting up clerk
  if (process.env.ENABLE_USER_MANAGEMENT !== "true") {
    return { userId: "user", isCustomer: true };
  }

  const header = req.headers.get("authorization");
  const { url, method } = req;
  console.log({ url, method });

  if (!header) {
    throw new AuthorizationError("No Authorization header", 401);
  }

  const token = header.replace("Bearer ", "");
  const { result, error } = await verifyKey(token);

  if (!result.valid) {
    console.error(result);
    throw new AuthorizationError(`Unauthorized: ${result.code}`, 401);
  }

  // Check subscription status
  const isActive = await checkUserSubscriptionStatus(result.ownerId);
  if (!isActive) {
    throw new AuthorizationError("Subscription canceled or inactive", 403);
  }

  // Check token usage
  const { remaining, usageError } = await checkTokenUsage(result.ownerId);
  console.log("remaining", remaining);

  if (usageError) {
    throw new AuthorizationError("Error checking token usage", 500);
  }

  if (remaining <= 0) {
    throw new AuthorizationError(
      "Credits limit exceeded. Top up your credits in settings.",
      429,
      true, // Mark as token limit error
      result.ownerId // Include userId so we can still fetch usage data
    );
  }

  await handleLogging(req, result.ownerId, false);

  return { userId: result.ownerId };
}
