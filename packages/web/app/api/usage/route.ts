import { NextResponse, NextRequest } from "next/server";
import { db, UserUsageTable } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await handleAuthorizationV2(request);

    const userUsage = await db
      .select({
        tokenUsage: UserUsageTable.tokenUsage,
        maxTokenUsage: UserUsageTable.maxTokenUsage,
        subscriptionStatus: UserUsageTable.subscriptionStatus,
        currentPlan: UserUsageTable.currentPlan,
        tier: UserUsageTable.tier,
      })
      .from(UserUsageTable)
      .where(and(eq(UserUsageTable.userId, userId)))
      .limit(1);

    if (!userUsage.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userUsage[0]);
  } catch (error) {
    if (error && error.status === 429 && error.isTokenLimitError) {
      try {
        const userId = error.userId;
        if (userId) {
          const userUsage = await db
            .select({
              tokenUsage: UserUsageTable.tokenUsage,
              maxTokenUsage: UserUsageTable.maxTokenUsage,
              subscriptionStatus: UserUsageTable.subscriptionStatus,
              currentPlan: UserUsageTable.currentPlan,
              tier: UserUsageTable.tier,
            })
            .from(UserUsageTable)
            .where(and(eq(UserUsageTable.userId, userId)))
            .limit(1);

          if (userUsage.length) {
            return NextResponse.json(
              { ...userUsage[0], error: error.message, isTokenLimitError: true },
              { status: 429 }
            );
          }
        }
      } catch (innerError) {
        console.error("Error fetching usage data for token-limited user:", innerError);
      }
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}
