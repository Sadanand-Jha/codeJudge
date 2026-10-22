import { create } from "zustand";
import type {
  AICreditBalance,
  AICreditUsageStats,
  CreatorAIUsage,
  AICreditPurchase,
  AICreditPaymentMethod,
  FairUsageStatus,
  AbuseDetectionStatus,
} from "@/types/aiCredits";
import {
  FAIR_USAGE_LIMITS,
  ABUSE_RULES,
  CREDIT_PACKS,
  CREDIT_PURCHASE_PACKS,
  creditCostMap,
  LOW_CREDIT_THRESHOLD,
  type AICreditFeatureId,
} from "@/config/aiCredits";

/* ============================================
   Initial state — no seeded data. Real purchases
   and usage are recorded as they happen.
   ============================================ */
const EMPTY_STATS: AICreditUsageStats = {
  remaining: 0,
  monthlyAllowance: 0,
  consumedToday: 0,
  consumedThisMonth: 0,
  perFeature: {
    "ai-hint": 0,
    "ai-code-review": 0,
    "ai-debugging": 0,
    "ai-test-cases": 0,
    "ai-quiz-generation": 0,
    "ai-explanation": 0,
    "ai-complexity": 0,
    "ai-question-improvement": 0,
    "ai-difficulty": 0,
    "ai-report-generation": 0,
  },
  averageDailyUsage: 0,
  estimatedDaysRemaining: 0,
  recentRequests: [],
  monthlyGraph: [],
};

const EMPTY_CREATOR: CreatorAIUsage = {
  quizGeneration: 0,
  questionImprovement: 0,
  testCaseGeneration: 0,
  difficultyAnalysis: 0,
  reportGeneration: 0,
  totalThisMonth: 0,
};

const EMPTY_FAIR_USAGE: FairUsageStatus = {
  requestsThisHour: 0,
  requestsThisDay: 0,
  concurrentRequests: 0,
  maxPerHour: FAIR_USAGE_LIMITS.maxRequestsPerHour,
  maxPerDay: FAIR_USAGE_LIMITS.maxRequestsPerDay,
  maxConcurrent: FAIR_USAGE_LIMITS.maxConcurrentRequests,
  isRateLimited: false,
};

const EMPTY_ABUSE: AbuseDetectionStatus = {
  isFlagged: false,
  activeRules: [],
  action: "none",
};

/* ============================================
   In-memory tracking for abuse detection
   ============================================ */
interface RequestPattern {
  promptHash: string;
  timestamps: number[];
  userAgent: string;
  sessionId: string;
}

const requestHistory = new Map<string, RequestPattern[]>();

/* ============================================
   Store
   ============================================ */
interface AICreditsState {
  /* data */
  balance: AICreditBalance;
  stats: AICreditUsageStats;
  creator: CreatorAIUsage;
  fairUsage: FairUsageStatus;
  abuse: AbuseDetectionStatus;
  purchases: AICreditPurchase[];

  /* actions */
  consumeCredits: (featureId: AICreditFeatureId, metadata?: { promptHash?: string; userAgent?: string; sessionId?: string }) => Promise<{ success: boolean; reason?: string; retryAfterMs?: number; message?: string }>;
  refundCredits: (featureId: AICreditFeatureId) => Promise<void>;
  completeRequest: () => void;
  purchasePack: (
    packId: string,
    meta?: { transactionId?: string; method?: AICreditPaymentMethod; status?: AICreditPurchase["status"] }
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAICreditsStore = create<AICreditsState>((set, get) => ({
  balance: {
    planId: "free",
    hasActiveSubscription: false,
    availableFeatures: [],
    monthlyCredits: 0,
    monthlyCreditsConsumed: 0,
    monthlyCreditsExpiry: 0,
    purchasedCredits: 0,
    purchasedCreditsConsumed: 0,
    consumedToday: 0,
    consumedThisHour: 0,
    totalRemaining: 0,
    monthlyAllowance: 0,
    remaining: 0,
  },
  stats: EMPTY_STATS,
  creator: EMPTY_CREATOR,
  fairUsage: EMPTY_FAIR_USAGE,
  abuse: EMPTY_ABUSE,
  purchases: [],

  consumeCredits: async (featureId, metadata?: { promptHash?: string; userAgent?: string; sessionId?: string }): Promise<{ success: boolean; reason?: string; retryAfterMs?: number; message?: string }> => {
    const cost = creditCostMap[featureId];
    if (!cost) return { success: false, reason: "invalid_feature" };

    const { balance, fairUsage } = get();

    // Check subscription
    if (!balance.hasActiveSubscription) {
      return { success: false, reason: "no_subscription" as const };
    }

    // Check credits - use totalRemaining
    if (balance.totalRemaining < cost) {
      return { success: false, reason: "insufficient_credits" as const };
    }

    // Check rate limiting
    if (fairUsage.isRateLimited) {
      return { success: false, reason: "rate_limited" as const, retryAfterMs: fairUsage.retryAfterMs };
    }

    // Check fair usage limits
    if (fairUsage.requestsThisHour >= FAIR_USAGE_LIMITS.maxRequestsPerHour) {
      return { success: false, reason: "hourly_limit_exceeded" as const };
    }

    if (fairUsage.requestsThisDay >= FAIR_USAGE_LIMITS.maxRequestsPerDay) {
      return { success: false, reason: "daily_limit_exceeded" as const };
    }

    if (fairUsage.concurrentRequests >= FAIR_USAGE_LIMITS.maxConcurrentRequests) {
      return { success: false, reason: "concurrent_limit_exceeded" as const };
    }

    // Abuse detection
    const abuseResult = detectAbuse(featureId, metadata);
    if (abuseResult.isFlagged && abuseResult.action === "escalate") {
      return { success: false, reason: "abuse_detected" as const, message: abuseResult.message };
    }

    // Deduct from monthly credits first, then purchased
    const monthlyRemaining = balance.monthlyCredits - balance.monthlyCreditsConsumed;
    const fromMonthly = Math.min(monthlyRemaining, cost);
    const fromPurchased = cost - fromMonthly;

    set({
      balance: {
        ...balance,
        monthlyCreditsConsumed: balance.monthlyCreditsConsumed + fromMonthly,
        purchasedCreditsConsumed: balance.purchasedCreditsConsumed + fromPurchased,
        consumedToday: balance.consumedToday + cost,
        consumedThisHour: balance.consumedThisHour + cost,
        totalRemaining: balance.totalRemaining - cost,
        remaining: balance.totalRemaining - cost, // backward compat
      },
      fairUsage: {
        ...fairUsage,
        requestsThisHour: fairUsage.requestsThisHour + 1,
        requestsThisDay: fairUsage.requestsThisDay + 1,
        concurrentRequests: fairUsage.concurrentRequests + 1,
      },
    });

    return { success: true };
  },

  refundCredits: async (featureId) => {
    const cost = creditCostMap[featureId];
    if (!cost) return;
    const { balance, fairUsage } = get();
    set({
      balance: {
        ...balance,
        monthlyCreditsConsumed: Math.max(0, balance.monthlyCreditsConsumed - cost),
        purchasedCreditsConsumed: Math.max(0, balance.purchasedCreditsConsumed - cost),
        consumedToday: Math.max(0, balance.consumedToday - cost),
        consumedThisHour: Math.max(0, balance.consumedThisHour - cost),
        totalRemaining: balance.totalRemaining + cost,
        remaining: balance.totalRemaining + cost, // backward compat
      },
      fairUsage: {
        ...fairUsage,
        concurrentRequests: Math.max(0, fairUsage.concurrentRequests - 1),
      },
    });
  },

  completeRequest: () => {
    const { fairUsage } = get();
    set({
      fairUsage: {
        ...fairUsage,
        concurrentRequests: Math.max(0, fairUsage.concurrentRequests - 1),
      },
    });
  },

  purchasePack: async (packId, meta) => {
    const pack =
      CREDIT_PACKS.find((p) => p.id === packId) ??
      CREDIT_PURCHASE_PACKS.find((p) => p.id === packId);
    if (!pack) return;

    const { balance, purchases } = get();
    set({
      balance: {
        ...balance,
        purchasedCredits: balance.purchasedCredits + pack.credits,
        totalRemaining: balance.totalRemaining + pack.credits,
        remaining: balance.totalRemaining + pack.credits, // backward compat
      },
      purchases: [
        ...purchases,
        {
          transactionId: meta?.transactionId,
          packId: pack.id,
          packName: pack.name,
          credits: pack.credits,
          price: pack.price,
          timestamp: Date.now(),
          method: meta?.method,
          status: meta?.status ?? "completed",
        },
      ],
    });
  },

  refresh: async () => {
    /* In production, fetch from API. Demo is no-op. */
  },
}));

/* ============================================
   Abuse Detection Helpers
   ============================================ */
function detectAbuse(
  featureId: AICreditFeatureId,
  metadata?: { promptHash?: string; userAgent?: string; sessionId?: string }
): AbuseDetectionStatus {
  const now = Date.now();
  const userId = "demo-user"; // In production, use actual user ID
  const key = `${userId}-${featureId}`;
  const userAgent = metadata?.userAgent || "unknown";
  const sessionId = metadata?.sessionId || "unknown";

  // Get or create request history for this user/feature
  if (!requestHistory.has(key)) {
    requestHistory.set(key, []);
  }
  const history = requestHistory.get(key)!;

  // Clean old entries (older than 5 minutes)
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  while (history.length > 0 && history[0].timestamps[0] < fiveMinutesAgo) {
    history.shift();
  }

  // Check for identical prompts
  if (metadata?.promptHash) {
    const existing = history.find((p) => p.promptHash === metadata.promptHash);
    if (existing) {
      existing.timestamps.push(now);
      const rule = ABUSE_RULES.find((r) => r.id === "identical-prompts")!;
      if (existing.timestamps.length >= rule.threshold) {
        return {
          isFlagged: true,
          activeRules: ["identical-prompts"],
          action: rule.action,
          message: "You're sending identical prompts too frequently. Please wait a moment.",
        };
      }
    } else {
      history.push({
        promptHash: metadata.promptHash,
        timestamps: [now],
        userAgent,
        sessionId,
      });
    }
  }

  // Check request frequency
  const oneMinuteAgo = now - 60 * 1000;
  const recentRequests = history.reduce((acc, p) => {
    return acc + p.timestamps.filter((t) => t > oneMinuteAgo).length;
  }, 0);

  const highFreqRule = ABUSE_RULES.find((r) => r.id === "high-frequency")!;
  if (recentRequests >= highFreqRule.threshold) {
    return {
      isFlagged: true,
      activeRules: ["high-frequency"],
      action: highFreqRule.action,
      message: "You're making requests too quickly. Slowing down your requests.",
    };
  }

  // Check bot-like behavior (very high frequency)
  const botRule = ABUSE_RULES.find((r) => r.id === "bot-like")!;
  if (recentRequests >= botRule.threshold) {
    return {
      isFlagged: true,
      activeRules: ["bot-like"],
      action: botRule.action,
      message: "Please verify you're human to continue.",
    };
  }

  return { isFlagged: false, activeRules: [], action: "none" };
}

export function checkLowCreditWarning(remaining: number, monthlyAllowance: number): boolean {
  if (monthlyAllowance <= 0) return false;
  return remaining / monthlyAllowance < LOW_CREDIT_THRESHOLD;
}

export function getRecommendedPack(remaining: number, monthlyAllowance: number): typeof CREDIT_PACKS[number] | null {
  if (monthlyAllowance <= 0) return null;
  
  const usageRatio = 1 - remaining / monthlyAllowance;
  
  // If less than 20% remaining, recommend starter
  if (usageRatio > 0.8) {
    return CREDIT_PACKS.find((p) => p.id === "starter") || null;
  }
  
  // If less than 50% remaining, recommend standard
  if (usageRatio > 0.5) {
    return CREDIT_PACKS.find((p) => p.id === "standard") || null;
  }
  
  return null;
}
