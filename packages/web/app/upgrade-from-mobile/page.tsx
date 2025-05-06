import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { _createStripeCheckoutSession } from "../dashboard/pricing/actions"; // Import the internal helper

// This page acts as a server-side redirect handler
export default async function UpgradeFromMobilePage() {
  const { userId } = await auth();

  if (!userId) {
    // If no user, redirect to login, maybe passing a redirect URL back here?
    // For now, redirecting to the generic sign-in page.
    redirect("/sign-in?redirect_url=/upgrade-from-mobile");
    return null; // Necessary after redirect
  }

  try {
    // Generate the checkout session URL for the default (e.g., monthly) plan
    // You could add logic here to choose a plan based on query params if needed
    const sessionUrl = await _createStripeCheckoutSession(userId, "SubscriptionMonthly");

    // Redirect the user to the Stripe Checkout page
    redirect(sessionUrl);
    return null; // Necessary after redirect

  } catch (error) {
    console.error("Error creating Stripe session for mobile upgrade:", error);
    // Redirect to pricing page with an error indicator?
    redirect("/dashboard/pricing?error=checkout_failed");
    return null; // Necessary after redirect
  }
} 