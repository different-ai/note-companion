"use server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { PRODUCTS, PRICES, ProductMetadata } from "../../../srm.config";
import { getUrl } from "@/lib/getUrl";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Helper to get URLs
const getUrls = () => {
  const origin = getUrl();
  return {
    // Consistent success/cancel URLs simplify things
    success: `${origin}/dashboard?checkout=success`,
    cancel: `${origin}/dashboard/pricing?checkout=cancel`,
    // Specific landing for lifetime might be nice, but optional
    // lifetime: `${origin}/dashboard/lifetime`,
  };
};

// Internal helper to create Stripe Session without redirecting
export async function _createStripeCheckoutSession(userId: string, plan: keyof typeof PRODUCTS) {
  const { success, cancel } = getUrls();
  const productConfig = PRODUCTS[plan];

  if (!productConfig) {
    throw new Error(`Invalid plan specified: ${plan}`);
  }

  const { userId: currentUser } = getAuth(); // Get the full auth object
  if (!currentUser || currentUser !== userId) throw new Error("User mismatch or not authenticated");

  // Fetch user details using clerkClient for email prefill
  const clerkUser = await clerkClient.users.getUser(userId);
  const userEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

  const metadata = {
    userId,
    type: productConfig.metadata.type,
    plan: productConfig.metadata.plan,
  };

  // Determine mode and line items based on product config
  const mode = productConfig.metadata.type === "subscription" ? "subscription" : "payment";
  const priceInfo = Object.values(productConfig.prices)[0]; // Assumes one price per product for simplicity here

  if (!priceInfo) {
    throw new Error(`No price info found for plan: ${plan}`);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: productConfig.name,
          metadata: {
            plan_type: productConfig.metadata.type,
            plan_name: productConfig.metadata.plan,
          },
        },
        unit_amount: priceInfo.amount,
        ...(mode === "subscription" && priceInfo.interval && priceInfo.interval !== 'one_time'
            ? { recurring: { interval: priceInfo.interval } }
            : {}),
      },
      quantity: 1,
    },
  ];

  const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    payment_method_types: ["card"],
    metadata,
    line_items: lineItems,
    success_url: success,
    cancel_url: cancel,
    allow_promotion_codes: true,
    ...(userEmail ? { customer_email: userEmail } : {}),
  };

  // Add subscription-specific data if applicable
  if (mode === "subscription") {
    sessionCreateParams.subscription_data = {
      metadata,
      ...(priceInfo.type === 'recurring' && priceInfo.trialPeriodDays
          ? { trial_period_days: priceInfo.trialPeriodDays }
          : {}),
    };
  }
  // Add payment_intent_data if applicable (for one-time payments)
  else if (mode === "payment") {
      sessionCreateParams.payment_intent_data = { metadata };
  }

  const session = await stripe.checkout.sessions.create(sessionCreateParams);

  if (!session.url) {
      throw new Error("Stripe session creation failed, no URL returned.");
  }

  return session.url;
}


// --- Existing Actions Refactored ---

export async function createPayOnceLifetimeCheckout() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const sessionUrl = await _createStripeCheckoutSession(userId, 'PayOnceLifetime');
  redirect(sessionUrl);
}

export async function createMonthlySubscriptionCheckout() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const sessionUrl = await _createStripeCheckoutSession(userId, 'SubscriptionMonthly');
  redirect(sessionUrl);
}

// Modified to just return URL for direct use if needed, but primarily redirects
export async function createYearlySubscriptionCheckout() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const sessionUrl = await _createStripeCheckoutSession(userId, 'SubscriptionYearly');
  redirect(sessionUrl);
}

// This was returning session before, now aligns with others
export async function createYearlySession(userId: string) {
   console.warn("createYearlySession is deprecated, use server action createYearlySubscriptionCheckout");
   const sessionUrl = await _createStripeCheckoutSession(userId, 'SubscriptionYearly');
   return { url: sessionUrl }; // Maintain previous return shape if needed elsewhere, but redirect is standard
}

export async function createPayOnceOneYearCheckout() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const sessionUrl = await _createStripeCheckoutSession(userId, 'PayOnceOneYear');
  redirect(sessionUrl);
}

// Add action for Top Up if needed
export async function createTopUpCheckout() {
    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");
    const sessionUrl = await _createStripeCheckoutSession(userId, 'PayOnceTopUp');
    redirect(sessionUrl);
}
