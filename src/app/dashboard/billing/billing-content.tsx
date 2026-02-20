"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  CreditCard,
  Zap,
  Users,
  HeadphonesIcon,
  Infinity,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { UserProfile } from "@/types/database";

interface BillingContentProps {
  user: UserProfile;
  modelsCount: number;
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 15,
    description: "Perfect for getting started",
    features: [
      "80 reels/month",
      "1 AI Model",
      "Standard quality",
      "Basic support",
    ],
    limits: {
      reels: 80,
      models: 1,
    },
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "pro",
    name: "Pro",
    price: 39,
    description: "Best for creators",
    features: [
      "Unlimited reels",
      "3 AI Models",
      "Priority processing",
      "Priority support",
      "Advanced features",
    ],
    limits: {
      reels: -1,
      models: 3,
    },
    color: "from-purple-500 to-purple-600",
    popular: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 99,
    description: "For teams and agencies",
    features: [
      "Unlimited everything",
      "Unlimited AI Models",
      "Highest priority",
      "Dedicated support",
      "API access",
      "White-label options",
    ],
    limits: {
      reels: -1,
      models: -1,
    },
    color: "from-yellow-500 to-orange-500",
  },
];

export function BillingContent({ user, modelsCount }: BillingContentProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const currentPlan = plans.find((p) => p.id === user.subscription_tier) || plans[0];
  const isOnTrial = user.subscription_status === "trial";

  const reelsUsed = user.current_reels_used || 0;
  const reelsLimit = user.monthly_reel_limit || currentPlan.limits.reels;
  const modelsLimit = user.models_limit || currentPlan.limits.models;

  const reelsPercentage = reelsLimit === -1 ? 0 : Math.min((reelsUsed / reelsLimit) * 100, 100);
  const modelsPercentage = modelsLimit === -1 ? 0 : Math.min((modelsCount / modelsLimit) * 100, 100);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      toast.info("Stripe checkout integration coming soon!");
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to process upgrade");
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    toast.info("Stripe billing portal integration coming soon!");
  };

  const formatReelsLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  const formatModelsLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and usage
        </p>
      </div>

      {/* Trial Banner */}
      {isOnTrial && user.trial_end_date && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">You&apos;re on a 7-day free trial</p>
                <p className="text-sm text-muted-foreground">
                  Your trial ends on {new Date(user.trial_end_date).toLocaleDateString()}
                </p>
              </div>
              <Button className="ml-auto" asChild>
                <Link href="/pricing">Upgrade now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You&apos;re currently on the {currentPlan.name} plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Badge */}
          <div className="flex items-center gap-3">
            <Badge className={cn("text-lg px-3 py-1 bg-gradient-to-r", currentPlan.color)}>
              {currentPlan.name}
            </Badge>
            <span className="text-2xl font-bold">${currentPlan.price}/month</span>
          </div>

          {/* Usage Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Reels Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Reels This Month
                </span>
                <span className="text-muted-foreground">
                  {reelsUsed} / {formatReelsLimit(reelsLimit)}
                </span>
              </div>
              <Progress value={reelsPercentage} className="h-2" />
              {reelsLimit !== -1 && reelsUsed >= reelsLimit && (
                <p className="text-xs text-destructive">
                  You&apos;ve reached your monthly limit
                </p>
              )}
            </div>

            {/* Models Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  AI Models
                </span>
                <span className="text-muted-foreground">
                  {modelsCount} / {formatModelsLimit(modelsLimit)}
                </span>
              </div>
              <Progress value={modelsPercentage} className="h-2" />
              {modelsLimit !== -1 && modelsCount >= modelsLimit && (
                <p className="text-xs text-destructive">
                  You&apos;ve reached your model limit
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Method */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Payment Method</p>
                <p className="text-xs text-muted-foreground">
                  {user.stripe_customer_id ? "•••• •••• •••• ••••" : "No payment method"}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleManageBilling}>
              {user.stripe_customer_id ? "Manage" : "Add Payment Method"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === user.subscription_tier;
            const canUpgrade = plans.findIndex((p) => p.id === user.subscription_tier) < plans.findIndex((p) => p.id === plan.id);

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative",
                  plan.popular && "border-primary shadow-lg shadow-primary/10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full bg-gradient-to-r"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading === plan.id}
                    >
                      {loading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upgrade to {plan.name}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/pricing">View Plan</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Link */}
      <div className="text-center text-sm text-muted-foreground">
        Have questions about billing?{" "}
        <Link href="/faq" className="text-primary hover:underline">
          Check our FAQ
        </Link>
      </div>
    </div>
  );
}
