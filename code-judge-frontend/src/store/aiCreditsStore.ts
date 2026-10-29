import { create } from "zustand";
import type {
  AICreditBalance,
  AICreditUsageEntry,
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
  creditCostMap,
  LOW_CREDIT_THRESHOLD,
  type AICreditFeatureId,
  type CreditPurchasePack,
} from "@/config/aiCredits";
import { getCreditBalance, getCreditUsage } from "@/services/aiCredits";
import { getUserTimeZone } from "@/lib/timezone";

interface CreditMetadata {
  promptHash?: string;
  userAgent?: string;
  sessionId?: string;
}

const AI_REASON_META: Record<
  string,
  { id: AICreditFeatureId; label: string }
> = {
  ai_chat: { id: "ai-hint", label: "AI Chat" },
  ai_chat_files: { id: "ai-hint", label: "AI Chat with Files" },
  ai_generate_questions: { id: "ai-quiz-generation", label: "AI Quiz Generation" },
  ai_generate_bank: { id: "ai-question-improvement", label: "AI Question Bank" },
  ai_generate_problems: { id: "ai-quiz-generation", label: "AI Problem Generation" },
  ai_generate_paper: { id: "ai-quiz-generation", label: "AI Paper Generation" },
  ai_generate_sections: { id: "ai-quiz-generation", label: "AI Section Generation" },
};

function toUsageEntry(row: {
  id: string;
  reason: string;
  credits: number;
  createdAt: string;
}): AICreditUsageEntry {
  const meta = AI_REASON_META[row.reason] ?? {
    id: "ai-quiz-generation" as AICreditFeatureId,
    label: "AI Generation",
  };
  const timestamp = Date.parse(row.createdAt);
  return {
    id: row.id,
    featureId: meta.id,
    featureLabel: meta.label,
    credits: row.credits,
    status: "success",
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
  };
}

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
  consumeCredits: (featureId: AICreditFeatureId, metadata?: CreditMetadata) => Promise<{ success: boolean; reason?: string; retryAfterMs?: number; message?: string }>;
  refundCredits: (featureId: AICreditFeatureId) => Promise<void>;
  completeRequest: () => void;
  /** Apply a server-authoritative remaining balance after an AI charge. */
  syncServerBalance: (remaining: number) => void;
  purchasePack: (
    packId: string,
    meta?: {
      transactionId?: string;
      method?: AICreditPaymentMethod;
      status?: AICreditPurchase["status"];
      credits?: number;
      packName?: string;
      price?: number;
    }
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

  consumeCredits: async (featureId, metadata?: CreditMetadata): Promise<{ success: boolean; reason?: string; retryAfterMs?: number; message?: string }> => {
    const cost = creditCostMap[featureId];
    if (!cost) return { success: false, reason: "invalid_feature" };

    const { balance, fairUsage } = get();

    // Free plans can spend purchased credits; paid plans also include monthly credits.
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

  syncServerBalance: (remaining) => {
    const next = Math.max(0, Math.trunc(remaining));
    set((state) => ({
      balance: {
        ...state.balance,
        totalRemaining: next,
        remaining: next,
      },
    }));
  },

  purchasePack: async (packId, meta) => {
    const credits = meta?.credits ?? 0;
    if (credits <= 0) return;

    const { balance, purchases } = get();
    set({
      balance: {
        ...balance,
        purchasedCredits: balance.purchasedCredits + credits,
        totalRemaining: balance.totalRemaining + credits,
        remaining: balance.totalRemaining + credits, // backward compat
      },
      purchases: [
        ...purchases,
        {
          transactionId: meta?.transactionId,
          packId,
          packName: meta?.packName ?? packId,
          credits,
          price: meta?.price ?? 0,
          timestamp: Date.now(),
          method: meta?.method,
          status: meta?.status ?? "completed",
        },
      ],
    });
  },

  refresh: async () => {
    try {
      const [snapshot, usage] = await Promise.all([
        getCreditBalance(),
        getCreditUsage(getUserTimeZone()),
      ]);
      const planTotal = Math.max(0, snapshot.planCreditsTotal);
      const purchasedTotal = Math.max(0, snapshot.purchasedCreditsTotal);
      const planRemaining = Math.max(0, snapshot.planCredits);
      const purchasedRemaining = Math.max(0, snapshot.purchasedCredits);
      const expiry = snapshot.nearestExpiry
        ? Date.parse(snapshot.nearestExpiry)
        : 0;

      set((state) => ({
        balance: {
          ...state.balance,
          monthlyCredits: planTotal,
          monthlyAllowance: planTotal,
          monthlyCreditsConsumed: Math.max(0, planTotal - planRemaining),
          monthlyCreditsExpiry: Number.isFinite(expiry) ? expiry : 0,
          purchasedCredits: purchasedTotal,
          purchasedCreditsConsumed: Math.max(0, purchasedTotal - purchasedRemaining),
          totalRemaining: Math.max(0, snapshot.balance),
          remaining: Math.max(0, snapshot.balance),
          hasActiveSubscription:
            state.balance.hasActiveSubscription || planTotal > 0,
        },
        stats: {
          ...state.stats,
          remaining: Math.max(0, snapshot.balance),
          monthlyAllowance: planTotal,
          consumedToday: usage.consumedToday,
          consumedThisMonth: usage.consumedThisMonth,
          averageDailyUsage: usage.averageDailyUsage,
          estimatedDaysRemaining:
            usage.averageDailyUsage > 0
              ? Math.floor(Math.max(0, snapshot.balance) / usage.averageDailyUsage)
              : 0,
          monthlyGraph: usage.monthlyGraph,
          recentRequests: usage.recentRequests.map(toUsageEntry),
        },
      }));
    } catch {
      // Keep the last known balance when the API is unavailable.
    }
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

export function getRecommendedPack(
  remaining: number,
  monthlyAllowance: number,
  packs: CreditPurchasePack[]
): CreditPurchasePack | null {
  if (monthlyAllowance <= 0 || packs.length === 0) return null;

  const usageRatio = 1 - remaining / monthlyAllowance;
  const sorted = [...packs].sort((a, b) => a.price - b.price);

  // If less than 20% remaining, recommend the smaller top-up.
  if (usageRatio > 0.8) return sorted[0] ?? null;

  // If less than 50% remaining, recommend the better-value top-up.
  if (usageRatio > 0.5) {
    return [...packs].sort((a, b) => {
      const aRate = a.credits > 0 ? a.price / a.credits : Number.POSITIVE_INFINITY;
      const bRate = b.credits > 0 ? b.price / b.credits : Number.POSITIVE_INFINITY;
      return aRate - bRate;
    })[0] ?? null;
  }

  return null;
}
