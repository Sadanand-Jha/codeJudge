"use client";

import { useEffect, useState } from "react";
import { useMySubscription } from "@/hooks/useMySubscription";
import { useAICreditsStore } from "@/store/aiCreditsStore";

export const AI_UPGRADE_SUBSCRIPTION_MESSAGE =
  "AI features are available on paid plans. Upgrade your plan to use AI.";
export const AI_UPGRADE_CREDITS_MESSAGE =
  "You do not have enough AI credits. Buy a credit pack to continue.";
export const AI_UPGRADE_SUBSCRIPTION_HREF = "/pricing";
export const AI_UPGRADE_CREDITS_HREF = "/pricing/credits";

/**
 * Server-authoritative access check for AI features.
 *
 * AI requests require both an active paid plan and a positive credit balance.
 * The backend enforces the same rules; this hook keeps the UI from starting
 * requests that are guaranteed to fail.
 */
export function useAiAccess() {
  const { subscription, isLoading: subscriptionLoading } = useMySubscription();
  const totalRemaining = useAICreditsStore((state) => state.balance.totalRemaining);
  const refreshCredits = useAICreditsStore((state) => state.refresh);
  const [creditsLoading, setCreditsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void refreshCredits().finally(() => {
      if (!cancelled) setCreditsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshCredits]);

  const hasPaidPlan =
    subscription?.isPaid === true && subscription.status !== "trialing";
  const hasAiCredits = totalRemaining > 0;
  const aiLoading = subscriptionLoading || creditsLoading;
  const canUseAi = hasPaidPlan && hasAiCredits;
  const aiUpgradeHref = hasPaidPlan
    ? AI_UPGRADE_CREDITS_HREF
    : AI_UPGRADE_SUBSCRIPTION_HREF;
  const aiUpgradeMessage = hasPaidPlan
    ? AI_UPGRADE_CREDITS_MESSAGE
    : AI_UPGRADE_SUBSCRIPTION_MESSAGE;

  return {
    subscription,
    hasPaidPlan,
    hasAiCredits,
    canUseAi,
    isLoading: aiLoading,
    subscriptionLoading,
    creditsLoading,
    aiLoading,
    aiUpgradeHref,
    aiUpgradeMessage,
    refreshCredits,
  };
}
