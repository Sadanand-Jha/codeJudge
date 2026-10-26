// AI credit accounting for token-based usage.
//
// One AI credit represents 1,000 model tokens (input + output + reasoning).
// Generation is charged after the provider reports usage, so the account is
// debited for the exact work performed rather than a fixed per-feature price.

import type { LiveUsage } from "./ai.service.ts";
import { getCreditBalance } from "../repositories/billing.repository.ts";
import { debitAiCredits } from "./entitlements/guards.ts";
import { EntitlementError } from "./entitlements/errors.ts";

/** Number of model tokens represented by one AI credit. */
export const TOKENS_PER_AI_CREDIT = 1_000;

/** Smallest billable charge. Any non-zero usage costs at least one credit. */
export const MIN_AI_CREDIT_CHARGE = 1;

export interface AiCreditCharge {
  /** Credits debited for this request. */
  creditsCharged: number;
  /** Token count the charge was derived from. */
  tokensUsed: number;
  /** User's total available credits after the charge. */
  creditsRemaining: number;
}

/**
 * Reads the total token count from a normalized usage object. Providers that
 * omit `totalTokens` but return input/output counts are still billed for the
 * sum of both.
 */
export function totalTokensForUsage(
  usage: LiveUsage | null | undefined
): number {
  if (!usage) return 0;

  const total = Number(usage.totalTokens);
  if (Number.isFinite(total) && total > 0) return Math.trunc(total);

  const input = Number(usage.inputTokens);
  const output = Number(usage.outputTokens);
  const summed =
    (Number.isFinite(input) && input > 0 ? input : 0) +
    (Number.isFinite(output) && output > 0 ? output : 0);
  return Math.max(0, Math.trunc(summed));
}

/**
 * Converts tokens to whole credits. Partial credits round up so a small
 * request is never free, matching prepaid credit accounting.
 */
export function creditsForTokens(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  return Math.max(
    MIN_AI_CREDIT_CHARGE,
    Math.ceil(Math.trunc(tokens) / TOKENS_PER_AI_CREDIT)
  );
}

/** Credits represented by a usage object, before any balance checks. */
export function creditsForUsage(usage: LiveUsage | null | undefined): number {
  return creditsForTokens(totalTokensForUsage(usage));
}

function numericUserId(userId: string | number): number {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("A valid user id is required for AI credit accounting");
  }
  return id;
}

/**
 * Rejects requests from accounts with no spendable AI credits. Called before
 * generation starts so a zero-balance account cannot consume model tokens.
 */
export async function assertAiCreditsAvailable(
  userId: string | number
): Promise<number> {
  const id = numericUserId(userId);
  const balance = await getCreditBalance(String(id));
  if (balance.total > 0) return balance.total;

  throw new EntitlementError(
    "NO_AI_CREDITS",
    "You do not have enough AI credits for this action. Buy a credit pack to continue.",
    {
      limit: MIN_AI_CREDIT_CHARGE,
      used: 0,
      remaining: 0,
      requiredPlan: null,
      upgradeUrl: "/pricing/credits",
    }
  );
}

/**
 * Debits the credits corresponding to the provider-reported token usage.
 * Zero-usage responses are not charged (the provider exposed no billable
 * count). Returns the resulting balance for the SSE/JSON response.
 */
export async function chargeAiUsage(input: {
  userId: string | number;
  usage: LiveUsage | null | undefined;
  reason: string;
  refId?: string | null;
}): Promise<AiCreditCharge> {
  const id = numericUserId(input.userId);
  const tokensUsed = totalTokensForUsage(input.usage);
  const creditsCharged = creditsForTokens(tokensUsed);

  if (creditsCharged > 0) {
    await debitAiCredits({
      userId: id,
      amount: creditsCharged,
      reason: input.reason,
      refId: input.refId ?? null,
    });
  }

  const balance = await getCreditBalance(String(id));
  return {
    creditsCharged,
    tokensUsed,
    creditsRemaining: balance.total,
  };
}
