/**
 * Server-side AI Credits Validator
 * 
 * This provides the validation logic that should be replicated
 * in your backend API middleware. NEVER trust frontend credit values.
 * 
 * Usage in API routes:
 *   import { validateAICredits, checkFairUsage, checkAbuse } from '@/lib/aiCreditsValidator';
 */

import type { AICreditFeatureId } from "@/config/aiCredits";
import { FAIR_USAGE_LIMITS, ABUSE_RULES, creditCostMap } from "@/config/aiCredits";

/* ============================================
   Validation Result Types
   ============================================ */
export interface CreditValidationResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  creditsRequired: number;
}

export interface FairUsageCheck {
  allowed: boolean;
  reason?: string;
  current: {
    hourly: number;
    daily: number;
    concurrent: number;
  };
  limits: typeof FAIR_USAGE_LIMITS;
}

export interface AbuseCheck {
  isFlagged: boolean;
  activeRules: string[];
  action: "none" | "slow" | "captcha" | "notify" | "escalate";
  message?: string;
}

/* ============================================
   Credit Validation
   ============================================ */
export function validateAICredits(params: {
  userId: string;
  featureId: AICreditFeatureId;
  remainingCredits: number;
  hasActiveSubscription: boolean;
  isRateLimited?: boolean;
  retryAfterMs?: number;
}): CreditValidationResult {
  const { userId, featureId, remainingCredits, hasActiveSubscription, isRateLimited, retryAfterMs } = params;
  const cost = creditCostMap[featureId];

  // No cost defined
  if (!cost) {
    return {
      allowed: false,
      reason: "invalid_feature",
      creditsRequired: 0,
    };
  }

  // No subscription
  if (!hasActiveSubscription) {
    return {
      allowed: false,
      reason: "no_subscription",
      creditsRequired: cost,
    };
  }

  // Rate limited
  if (isRateLimited) {
    return {
      allowed: false,
      reason: "rate_limited",
      retryAfterMs: retryAfterMs || 1000,
      creditsRequired: cost,
    };
  }

  // Insufficient credits
  if (remainingCredits < cost) {
    return {
      allowed: false,
      reason: "insufficient_credits",
      creditsRequired: cost,
    };
  }

  return {
    allowed: true,
    creditsRequired: cost,
  };
}

/* ============================================
   Fair Usage Validation
   ============================================ */
export function checkFairUsage(params: {
  requestsThisHour: number;
  requestsThisDay: number;
  concurrentRequests: number;
}): FairUsageCheck {
  const { requestsThisHour, requestsThisDay, concurrentRequests } = params;

  const violations: string[] = [];

  if (requestsThisHour >= FAIR_USAGE_LIMITS.maxRequestsPerHour) {
    violations.push(`hourly_limit_exceeded (${requestsThisHour}/${FAIR_USAGE_LIMITS.maxRequestsPerHour})`);
  }

  if (requestsThisDay >= FAIR_USAGE_LIMITS.maxRequestsPerDay) {
    violations.push(`daily_limit_exceeded (${requestsThisDay}/${FAIR_USAGE_LIMITS.maxRequestsPerDay})`);
  }

  if (concurrentRequests >= FAIR_USAGE_LIMITS.maxConcurrentRequests) {
    violations.push(`concurrent_limit_exceeded (${concurrentRequests}/${FAIR_USAGE_LIMITS.maxConcurrentRequests})`);
  }

  return {
    allowed: violations.length === 0,
    reason: violations[0],
    current: {
      hourly: requestsThisHour,
      daily: requestsThisDay,
      concurrent: concurrentRequests,
    },
    limits: FAIR_USAGE_LIMITS,
  };
}

/* ============================================
   Abuse Detection
   ============================================ */
export function checkAbuse(params: {
  userId: string;
  featureId: AICreditFeatureId;
  promptHash?: string;
  userAgent?: string;
  sessionId?: string;
  recentRequestsPerMinute: number;
  identicalPromptCount: number;
}): AbuseCheck {
  const { userId, featureId, recentRequestsPerMinute, identicalPromptCount } = params;
  const activeRules: string[] = [];
  let action: "none" | "slow" | "captcha" | "notify" | "escalate" = "none";
  let message: string | undefined;

  // Check identical prompts
  const identicalRule = ABUSE_RULES.find((r) => r.id === "identical-prompts")!;
  if (identicalPromptCount >= identicalRule.threshold) {
    activeRules.push("identical-prompts");
    if (action === "none") action = identicalRule.action as any;
  }

  // Check high frequency
  const highFreqRule = ABUSE_RULES.find((r) => r.id === "high-frequency")!;
  if (recentRequestsPerMinute >= highFreqRule.threshold) {
    activeRules.push("high-frequency");
    if (action === "none") action = highFreqRule.action as any;
  }

  // Check bot-like behavior
  const botRule = ABUSE_RULES.find((r) => r.id === "bot-like")!;
  if (recentRequestsPerMinute >= botRule.threshold) {
    activeRules.push("bot-like");
    action = botRule.action as any;
    message = "Please verify you're human to continue.";
  }

  return {
    isFlagged: activeRules.length > 0,
    activeRules,
    action,
    message,
  };
}

/* ============================================
   Prompt Size Validation
   ============================================ */
export function validatePromptSize(promptSizeKB: number): { valid: boolean; reason?: string } {
  if (promptSizeKB > FAIR_USAGE_LIMITS.maxPromptSizeKB) {
    return {
      valid: false,
      reason: `Prompt size exceeds limit (${promptSizeKB}KB > ${FAIR_USAGE_LIMITS.maxPromptSizeKB}KB)`,
    };
  }
  return { valid: true };
}

/* ============================================
   Response Size Validation
   ============================================ */
export function validateResponseSize(responseSizeKB: number): { valid: boolean; reason?: string } {
  if (responseSizeKB > FAIR_USAGE_LIMITS.maxResponseSizeKB) {
    return {
      valid: false,
      reason: `Response size exceeds limit (${responseSizeKB}KB > ${FAIR_USAGE_LIMITS.maxResponseSizeKB}KB)`,
    };
  }
  return { valid: true };
}