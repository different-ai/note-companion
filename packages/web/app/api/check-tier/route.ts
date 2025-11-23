import { NextResponse, NextRequest } from "next/server";
import { checkIfUserNeedsUpgrade, checkTokenUsage } from "@/drizzle/schema";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await handleAuthorizationV2(request);

    // Check if user needs to upgrade
    const needsUpgrade = await checkIfUserNeedsUpgrade(userId);
    
    // Get token usage information
    const tokenUsage = await checkTokenUsage(userId);
    
    return NextResponse.json({
      needsUpgrade,
      remainingTokens: tokenUsage.remaining,
      usageError: tokenUsage.usageError
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
} 