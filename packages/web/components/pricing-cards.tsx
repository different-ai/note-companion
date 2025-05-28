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
import { Check, Sparkles, Info, ArrowRight } from "lucide-react";
import { config } from "@/srm.config";
import { twMerge } from "tailwind-merge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  createMonthlySubscriptionCheckout,
  createYearlySubscriptionCheckout,
} from "@/app/dashboard/pricing/actions";
import Link from "next/link";

interface PricingCardsProps {
  onSubscriptionComplete?: (type: 'cloud') => void;
}

export function PricingCards({ onSubscriptionComplete }: PricingCardsProps) {
  const [isYearly, setIsYearly] = useState(false);



  const handlePlanSelection = async (planKey: string) => {
    try {
      let redirectUrl;
      
      switch (planKey) {
        case "Monthly":
          redirectUrl = await createMonthlySubscriptionCheckout();
          onSubscriptionComplete?.('cloud');
          break;
        case "Yearly":
          redirectUrl = await createYearlySubscriptionCheckout();
          onSubscriptionComplete?.('cloud');
          break;
        default:
          return;
      }
      
      // If there's a redirect URL, navigate to it
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    }
  };



  const renderSubscriptionPlan = () => {
    const planKey = isYearly ? "SubscriptionYearly" : "SubscriptionMonthly";
    const product = config.products[planKey];
    const priceKey = isYearly ? "yearly" : "monthly";
    const price = product.prices[priceKey];

    // Add mobile app feature to subscription plan
    const features = [...product.features];
    features.push("Access to mobile app (coming soon) for easy screenshots from anywhere");

    return (
      <Card
        className="p-6 rounded-xl flex-1 relative shadow-md transition-all hover:shadow-lg bg-white border-violet-500 border-2"
      >
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-violet-100 text-violet-700 px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>

        <CardHeader className="pb-4">
          <div className="flex flex-col">
            <div>
              <div className="flex items-center mb-2">
                <CardTitle className="text-2xl font-bold">{product.name}</CardTitle>
              </div>
              <CardDescription className="text-3xl font-bold text-black mt-3 mb-3">
                ${price.amount / 100}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  /{price.interval}
                  {isYearly && (
                    <div className="text-xs text-violet-600 font-semibold mt-1">
                      Save ~33% with yearly billing
                    </div>
                  )}
                </span>
              </CardDescription>
              <div className="flex items-center gap-3 mt-3 mb-2">
                <span className={`text-sm font-medium ${!isYearly ? 'text-violet-700 font-semibold' : 'text-gray-600'}`}>
                  Monthly
                </span>
                <div className="relative">
                  <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                    className="mt-[2px]"
                  />
                </div>
                <span className={`text-sm font-medium ${isYearly ? 'text-violet-700 font-semibold' : 'text-gray-600'}`}>
                  Yearly
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-6">
          <ul className="space-y-3">
            {features.map((feature: string, index: number) => {
              const isPremiumFeature = feature.toLowerCase().includes("premium") || 
                                       feature.toLowerCase().includes("onboarding") || 
                                       feature.toLowerCase().includes("unlimited");
              
              return (
                <li key={index} className={`flex items-start text-sm ${isPremiumFeature ? 'opacity-100' : 'opacity-90'}`}>
                  {isPremiumFeature ? (
                    <Sparkles className="h-5 w-5 mr-3 text-violet-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`${isPremiumFeature ? 'text-black font-medium' : 'text-gray-700'}`}>
                    {feature}
                    {isPremiumFeature && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800">
                        Premium
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full py-6 text-base font-medium transition-all cursor-pointer bg-violet-600 hover:bg-violet-700 text-white border-none shadow-md hover:shadow-lg"
            variant="default"
            onClick={() => handlePlanSelection(isYearly ? "Yearly" : "Monthly")}
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="mx-auto">
      <div className="flex flex-col md:flex-row gap-8 justify-center">
        {renderSubscriptionPlan()}
      </div>
    </div>
  );
}
