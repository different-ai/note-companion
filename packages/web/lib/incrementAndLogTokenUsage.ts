import PostHogClient from "@/lib/posthog";
import { incrementTokenUsage, checkTokenUsage, checkIfUserNeedsUpgrade } from "../drizzle/schema";

/**
 * Increments a user's token usage and logs the event to PostHog.
 * Also checks whether the user has exceeded their tier limits.
 * 
 * @param userId The user's ID
 * @param tokens The number of tokens to increment by
 * @returns Object containing remaining tokens and error status
 */
export async function incrementAndLogTokenUsage(
  userId: string,
  tokens: number
) {
  if (process.env.ENABLE_USER_MANAGEMENT !== "true") {
    return { remaining: 0, usageError: false };
  }
  
  // First check if user has available tokens based on their tier
  const { remaining: currentRemaining, usageError: checkError } = await checkTokenUsage(userId);
  
  // Check if user needs to upgrade (has used all available tokens)
  const needsUpgrade = await checkIfUserNeedsUpgrade(userId);
  
  if (checkError) {
    console.error("Error checking token usage for user:", userId);
    return { remaining: 0, usageError: true };
  }
  
  // If user has no tokens remaining, return early
  if (currentRemaining <= 0 || needsUpgrade) {
    console.log(`User ${userId} has no tokens remaining or needs to upgrade`);
    return { remaining: 0, usageError: false, needsUpgrade: true };
  }
  
  // Validate tokens is a valid number
  const validTokens = Number.isNaN(tokens) ? 0 : Math.max(0, Math.floor(tokens));
  
  // Only increment if we have tokens to use
  const { remaining, usageError } = await incrementTokenUsage(userId, validTokens);

  if (!usageError) {
    const client = PostHogClient();
    if (client) {
      client.capture({
        distinctId: userId,
        event: "token_usage",
        properties: {
          remaining,
          tokens: validTokens,
        },
      });
    }
  }
  
  return { 
    remaining, 
    usageError,
    needsUpgrade: remaining <= 0
  };
}
