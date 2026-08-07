"use client";

import { useCallback } from "react";
import { useAICreditsStore, checkLowCreditWarning, getRecommendedPack } from "@/store/aiCreditsStore";
import type { AICreditFeatureId } from "@/config/aiCredits";

/* ============================================
   Hook for consuming AI credits with automatic
   abuse detection metadata and error handling.
   ============================================ */
export function useAICreditConsumption() {
  const consumeCredits = useAICreditsStore((s) => s.consumeCredits);
  const refundCredits = useAICreditsStore((s) => s.refundCredits);
  const completeRequest = useAICreditsStore((s) => s.completeRequest);
  const balance = useAICreditsStore((s) => s.balance);
  const purchasePack = useAICreditsStore((s) => s.purchasePack);

  const consume = useCallback(
    async (
      featureId: AICreditFeatureId,
      options?: {
        promptHash?: string;
        userAgent?: string;
        sessionId?: string;
        onSuccess?: () => void;
        onError?: (reason: string, message?: string) => void;
        onInsufficientCredits?: () => void;
      }
    ) => {
      const metadata = {
        promptHash: options?.promptHash,
        userAgent: options?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
        sessionId: options?.sessionId || (typeof window !== "undefined" ? sessionStorage.getItem("sessionId") || "default" : "default"),
      };

      const result = await consumeCredits(featureId, metadata);

      if (result.success) {
        options?.onSuccess?.();
        return { allowed: true };
      }

      // Handle specific failure reasons
      switch (result.reason) {
        case "insufficient_credits":
          options?.onInsufficientCredits?.();
          options?.onError?.("insufficient_credits", "You don't have enough AI credits for this request.");
          break;
        case "hourly_limit_exceeded":
          options?.onError?.("hourly_limit_exceeded", "You've reached the maximum number of requests per hour. Please wait.");
          break;
        case "daily_limit_exceeded":
          options?.onError?.("daily_limit_exceeded", "You've reached the maximum number of requests per day. Please try again tomorrow.");
          break;
        case "concurrent_limit_exceeded":
          options?.onError?.("concurrent_limit_exceeded", "You have too many concurrent requests. Please wait for your current requests to complete.");
          break;
        case "abuse_detected":
          options?.onError?.("abuse_detected", result.message || "Suspicious activity detected. Please slow down.");
          break;
        case "no_subscription":
          options?.onError?.("no_subscription", "You need an active subscription to use AI features.");
          break;
        case "rate_limited":
          options?.onError?.("rate_limited", `Too many requests. Please retry after ${Math.ceil((result.retryAfterMs || 1000) / 1000)} seconds.`);
          break;
        default:
          options?.onError?.(result.reason || "unknown_error", "An unexpected error occurred.");
      }

      return { allowed: false, reason: result.reason, message: result.message };
    },
    [consumeCredits]
  );

  const refund = useCallback(
    async (featureId: AICreditFeatureId) => {
      await refundCredits(featureId);
    },
    [refundCredits]
  );

  const done = useCallback(() => {
    completeRequest();
  }, [completeRequest]);

  const buyCredits = useCallback(
    async (packId: string) => {
      await purchasePack(packId);
    },
    [purchasePack]
  );

  const isLowCredit = checkLowCreditWarning(balance.remaining, balance.monthlyAllowance);
  const recommendedPack = getRecommendedPack(balance.remaining, balance.monthlyAllowance);

  return {
    consume,
    refund,
    completeRequest: done,
    balance,
    purchasePack: buyCredits,
    isLowCredit,
    recommendedPack,
  };
}