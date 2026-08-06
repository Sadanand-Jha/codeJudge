import { create } from "zustand";
import type {
  AICreditBalance,
  AICreditUsageEntry,
  AICreditUsageStats,
  CreatorAIUsage,
  AICreditPurchase,
  FairUsageStatus,
  AbuseDetectionStatus,
} from "@/types/aiCredits";
import {
  AI_CREDIT_COSTS,
  FAIR_USAGE_LIMITS,
  PLAN_CREDIT_ALLOWANCES,
  ABUSE_RULES,
  RATE_LIMIT_CONFIG,
  CREDIT_PACKS,
  creditCostMap,
  LOW_CREDIT_THRESHOLD,
  type AICreditFeatureId,
} from "@/config/aiCredits";

/* ============================================
   Demo / Mock data — replace with real API calls.
   ============================================ */
const now = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function makeEntry(
  id: string,
  featureId: AICreditFeatureId,
  ts: number,
  status: AICreditUsageEntry["status"] = "success"
): AICreditUsageEntry {
  const def = AI_CREDIT_COSTS.find((c) => c.id === featureId)!;
  return {
    id,
    featureId,
    featureLabel: def.label,
    credits: def.credits,
    status,
    timestamp: ts,
    promptSizeKB: Math.round(0.5 + Math.random() * 20),
    responseSizeKB: Math.round(0.3 + Math.random() * 8),
  };
}

const mockEntries: AICreditUsageEntry[] = [
  ...Array.from({ length: 8 }, (_, i) => makeEntry(`e${i}`, "ai-hint", now - i * HOUR)),
  ...Array.from({ length: 4 }, (_, i) => makeEntry(`e${i + 8}`, "ai-debugging", now - i * HOUR - 30 * 60 * 1000)),
  ...Array.from({ length: 3 }, (_, i) => makeEntry(`e${i + 12}`, "ai-code-review", now - i * DAY)),
  makeEntry("e15", "ai-quiz-generation", now - 2 * DAY, "refunded"),
  makeEntry("e16", "ai-test-cases", now - 3 * DAY),
  makeEntry("e17", "ai-question-improvement", now - 4 * DAY),
  makeEntry("e18", "ai-complexity", now - 5 * DAY),
  makeEntry("e19", "ai-explanation", now - 6 * DAY),
];

const mockStats: AICreditUsageStats = {
  remaining: 183,
  monthlyAllowance: 300,
  consumedToday: 27,
  consumedThisMonth: 117,
  perFeature: {
    "ai-hint": 45,
    "ai-code-review": 24,
    "ai-debugging": 18,
    "ai-test-cases": 10,
    "ai-quiz-generation": 8,
    "ai-explanation": 6,
    "ai-complexity": 4,
    "ai-question-improvement": 2,
    "ai-difficulty": 0,
    "ai-report-generation": 0,
  },
  averageDailyUsage: 4.5,
  estimatedDaysRemaining: 34,
  recentRequests: mockEntries.slice(0, 10),
  monthlyGraph: Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      day: d.toISOString().slice(5, 10),
      credits: Math.max(0, Math.round(2 + Math.random() * 12)),
    };
  }),
};

const mockCreator: CreatorAIUsage = {
  quizGeneration: 12,
  questionImprovement: 8,
  testCaseGeneration: 5,
  difficultyAnalysis: 3,
  reportGeneration: 2,
  totalThisMonth: 30,
};

const mockFairUsage: FairUsageStatus = {
  requestsThisHour: 8,
  requestsThisDay: 42,
  concurrentRequests: 1,
  maxPerHour: FAIR_USAGE_LIMITS.maxRequestsPerHour,
  maxPerDay: FAIR_USAGE_LIMITS.maxRequestsPerDay,
  maxConcurrent: FAIR_USAGE_LIMITS.maxConcurrentRequests,
  isRateLimited: false,
};

const mockAbuse: AbuseDetectionStatus = {
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
  purchasePack: (packId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAICreditsStore = create<AICreditsState>((set, get) => ({
  balance: {
    planId: "student-pro",
    hasActiveSubscription: true,
    availableFeatures: ["ai-companion", "ai-hint", "ai-debugger", "ai-explanation", "ai-complexity"],
    monthlyCredits: 300,
    monthlyCreditsConsumed: 117,
    monthlyCreditsExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
    purchasedCredits: 0,
    purchasedCreditsConsumed: 0,
    consumedToday: 27,
    consumedThisHour: 4,
    totalRemaining: 183,
    monthlyAllowance: 300,
    remaining: 183,
  },
  stats: mockStats,
  creator: mockCreator,
  fairUsage: mockFairUsage,
  abuse: mockAbuse,
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

  purchasePack: async (packId) => {
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
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
          packId: pack.id,
          packName: pack.name,
          credits: pack.credits,
          price: pack.price,
          timestamp: Date.now(),
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
