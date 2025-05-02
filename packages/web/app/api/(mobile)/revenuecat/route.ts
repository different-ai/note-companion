import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateUserSubscriptionStatus } from "@/drizzle/schema";

// App Router: No need for config export

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.RC_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event;
  try {
    // Read the raw body text and parse as JSON
    const rawBody = await req.text();
    event = JSON.parse(rawBody);
  } catch (e) {
    console.error("Failed to parse webhook body:", e);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Type assertion (consider adding more robust validation/typing)
  const userId = event?.app_user_id as string;
  const eventType = event?.type as string;
  const periodType = event?.period_type as string; // Assuming period_type exists

  if (!userId || !eventType) {
    console.error("Webhook missing required fields (userId or eventType)");
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }


  const paid = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE"];
  const failed = ["BILLING_ISSUE", "CANCELLATION"];

  try {
      if (paid.includes(eventType)) {
        await createOrUpdateUserSubscriptionStatus(userId, "active", "paid", periodType || "unknown", "paid");
      } else if (failed.includes(eventType)) {
        await createOrUpdateUserSubscriptionStatus(userId, "inactive", "failed", periodType || "unknown", "free");
      } else {
        console.log(`Webhook received unhandled event type: ${eventType} for user ${userId}`);
        // Optionally handle other events or just acknowledge receipt
      }
  } catch (dbError) {
      console.error(`Database error processing webhook for user ${userId}, event ${eventType}:`, dbError);
      // Decide if you want to return a 500 error or still acknowledge receipt (2xx)
      // Returning 500 might cause RevenueCat to retry.
      return NextResponse.json({ error: "database error"}, { status: 500 });
  }


  // Respond with 2xx to acknowledge receipt
  return new NextResponse(null, { status: 204 });
}