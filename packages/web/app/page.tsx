export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserBillingCycle } from "./actions";

export default async function MainPage() {
  if (process.env.ENABLE_USER_MANAGEMENT !== "true") {
    redirect("/dashboard/self-hosted");
  }

  const { userId } = await auth();

  const billingCycle = await getUserBillingCycle(userId);
  console.log("Billing cycle:", billingCycle);

  // if billing cycle part of legacy plans
  const isSubscription = [
    // legacy cycle
    "monthly",
    "yearly",
    // new up to date cycle
    "subscription",
  ].includes(billingCycle);

  // top-up is not a "PAY ONCE" plan
  const isPayOnce = ["pay-once", "lifetime"].includes(billingCycle);

  if (isSubscription) {
    redirect("/dashboard/subscribers");
  } else if (isPayOnce) {
    redirect("/dashboard/lifetime");
  } else {
    redirect("/dashboard/onboarding");
  }
}
