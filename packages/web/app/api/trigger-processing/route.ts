import { NextRequest, NextResponse } from "next/server";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";

export const maxDuration = 800; // This function can run for a maximum of 5 seconds

// max duration 10 seconds

// This endpoint allows triggering the background processing job
export async function POST(request: NextRequest) {
  console.log("[/api/trigger-processing] Received POST request"); // Log entry
  try {
    // Make sure the user is authenticated
    const authResult = await handleAuthorizationV2(request);
    const userId = authResult.userId;

    if (!userId) {
      console.log("[/api/trigger-processing] Unauthorized user attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`[/api/trigger-processing] User ${userId} authenticated`);

    // Call the process-pending-uploads endpoint
    const processingUrl = new URL("/api/process-pending-uploads", request.url);
    // --- Force HTTP for localhost --- 
    if (processingUrl.hostname === 'localhost') {
      processingUrl.protocol = 'http:';
    }
    // --- End Force HTTP --- 
    console.log(`[/api/trigger-processing] Attempting to call worker: ${processingUrl.toString()}`);
    
    const processingResponse = await fetch(
      processingUrl.toString(),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        cache: 'no-store', // Ensure it's not cached
      }
    );

    console.log(`[/api/trigger-processing] Worker call response status: ${processingResponse.status}`);

    if (!processingResponse.ok) {
      const errorText = await processingResponse.text();
      console.error(`[/api/trigger-processing] Failed to trigger processing: ${processingResponse.statusText}`, errorText);
      // Still return success to the mobile client, as the trigger itself was handled
      // but log the failure of the *worker call*.
       return NextResponse.json({
        success: true, // Indicate the trigger request was processed
        message: "Processing trigger attempted, but worker call failed.",
        workerStatus: processingResponse.status,
      }, { status: 200 }); // Return 200 OK despite worker issue
    }

    const result = await processingResponse.json();
    console.log("[/api/trigger-processing] Worker call successful, response:", result);

    return NextResponse.json({
      success: true,
      message: "Processing triggered successfully",
      details: result
    });
  } catch (error: unknown) {
    console.error("[/api/trigger-processing] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to trigger processing", details: errorMessage },
      { status: 500 }
    );
  }
} 