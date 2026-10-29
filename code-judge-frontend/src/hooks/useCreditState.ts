"use client";

import { useMemo } from "react";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import {
  creditStateFromSnapshot,
  normalizeCredits,
  type CreditState,
} from "@/lib/creditState";

export interface CreditStateResult {
  state: CreditState;
  balance: number;
  expiresAt: number | null;
  refetch: () => Promise<boolean>;
}

/**
 * Single source of truth for the Studio's low-fuel warning. Components must
 * derive the warning from this hook instead of reading the store's raw
 * totalRemaining, which can be 0 before the first server response.
 */
export function useCreditState(): CreditStateResult {
  const status = useAICreditsStore((state) => state.status);
  const hasSnapshot = useAICreditsStore((state) => state.hasSnapshot);
  const rawBalance = useAICreditsStore((state) => state.balance.totalRemaining);
  const expiresAt = useAICreditsStore((state) => state.expiresAt);
  const refetch = useAICreditsStore((state) => state.refresh);

  const state = useMemo(
    () => creditStateFromSnapshot({ balance: rawBalance, status, hasSnapshot }),
    [hasSnapshot, rawBalance, status]
  );

  return {
    state,
    balance: normalizeCredits(rawBalance),
    expiresAt,
    refetch,
  };
}
