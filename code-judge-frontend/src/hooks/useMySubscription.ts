"use client";

import { useEffect, useState } from "react";
import { getUserTimeZone } from "@/lib/timezone";
import { getMySubscription, type MySubscription } from "@/services/user";

export type TrialState = "active" | "expired" | "none";

export function getTrialState(subscription: MySubscription | null): TrialState {
  if (!subscription) return "none";
  if (subscription.status === "trialing") return "active";
  if (
    subscription.status === "free" &&
    subscription.trialEnd &&
    new Date(subscription.trialEnd).getTime() <= Date.now()
  ) {
    return "expired";
  }
  return "none";
}

export function formatTrialEnd(trialEnd: string | null): string | null {
  if (!trialEnd) return null;
  const date = new Date(trialEnd);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    timeZone: getUserTimeZone(),
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function useMySubscription() {
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMySubscription()
      .then((next) => {
        if (!cancelled) setSubscription(next);
      })
      .catch(() => {
        if (!cancelled) setSubscription(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { subscription, isLoading };
}
