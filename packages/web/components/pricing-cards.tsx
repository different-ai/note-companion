"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";
import { config } from "@/srm.config";
import { twMerge } from "tailwind-merge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  createPayOnceLifetimeCheckout,
  createMonthlySubscriptionCheckout,
  createYearlySubscriptionCheckout,
  createPayOnceOneYearCheckout,
} from "@/app/dashboard/pricing/actions";

export function PricingCards() {
  const [isYearly, setIsYearly] = useState(false);
  const [isLifetime, setIsLifetime] = useState(false);

  const handlePlanSelection = async (planKey: string) => {
    switch (planKey) {
      case "Monthly":
        return await createMonthlySubscriptionCheckout();
      case "Yearly":
        return await createYearlySubscriptionCheckout();
      case "Lifetime":
        return await createPayOnceLifetimeCheckout();
      case "OneYear":
        return await createPayOnceOneYearCheckout();
      default:
        return;
    }
  };

  const renderPlanCard = (planType: "subscription" | "lifetime") => {
    const isSubscription = planType === "subscription";
    const planKey = isSubscription
      ? isYearly
        ? "SubscriptionYearly"
        : "SubscriptionMonthly"
      : isLifetime
      ? "PayOnceLifetime"
      : "PayOnceOneYear";
    const product = config.products[planKey];
    const priceKey = isSubscription
      ? isYearly
        ? "yearly"
        : "monthly"
      : isLifetime
      ? "lifetime"
      : "one_year";
    const price = product.prices[priceKey];

    return (
      <Card
        className={twMerge(
          "p-4 rounded-xl flex-1 relative",
          !isSubscription && "!border-violet-500 !border-[0.1rem]"
        )}
      >
        {!isSubscription && isLifetime ? (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-[hsl(258,88%,90%)] text-[hsl(258,88%,45%)] px-3 py-1 rounded-full text-sm font-medium">
              Best Value
            </span>
          </div>
        ) : (
          isSubscription &&
          !isYearly && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm font-medium">
                First month $9 with code ANIMUS
              </span>
            </div>
          )
        )}

        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{product.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2 mb-2">
                <span>
                  {isSubscription ? "Monthly" : "Yours forever w/ 1 year of updates"}
                </span>
                <Switch
                  checked={isSubscription ? isYearly : isLifetime}
                  onCheckedChange={isSubscription ? setIsYearly : setIsLifetime}
                />
                <span>{isSubscription ? "Yearly" : "Lifetime"}</span>
              </div>
            </div>
            <CardDescription className="text-2xl font-bold">
              ${price.amount / 100}
                {isSubscription && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{price.interval}
                    {isYearly && (
                      <div className="text-xs text-primary font-medium mt-1">
                        Save ~33% with yearly billing
                      </div>
                    )}
                  </span>
                )}
         
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {product.features.map((feature: string, index: number) => (
              <li key={index} className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className={twMerge(
              "w-full mt-3",
              !isSubscription &&
                "bg-violet-600 hover:bg-violet-700 text-white border-none"
            )}
            variant={isSubscription ? "outline" : "default"}
            onClick={() =>
              handlePlanSelection(
                isSubscription
                  ? isYearly
                    ? "Yearly"
                    : "Monthly"
                  : isLifetime
                  ? "Lifetime"
                  : "OneYear"
              )
            }
          >
            {isSubscription
              ? "Get Started"
              : `Get ${isLifetime ? "Lifetime" : "One Year"} Access`}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        {renderPlanCard("subscription")}
        {renderPlanCard("lifetime")}
      </div>
    </div>
  );
}
