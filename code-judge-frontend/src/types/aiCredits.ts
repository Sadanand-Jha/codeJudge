import type { AICreditFeatureId, AISubscriptionFeatureId } from "@/config/aiCredits";

/* ============================================
   AI Credits — Types
   ============================================ */

export interface AICreditBalance {
  /** Active subscription plan id */
  planId: string;
  /** Whether the user has an active subscription */
  hasActiveSubscription: boolean;
  /** Subscription features available to user */
  availableFeatures: AISubscriptionFeatureId[];
  
  /** Monthly included credits (resets each billing cycle) */
  monthlyCredits: number;
  /** Monthly credits consumed this month */
  monthlyCreditsConsumed: number;
  /** Date when monthly credits expire */
  monthlyCreditsExpiry: number;
  
  /** Purchased credits (persistent, never expire) */
  purchasedCredits: number;
  /** Purchased credits consumed this month */
  purchasedCreditsConsumed: number;
  
  /** Total credits consumed today */
  consumedToday: number;
  /** Total credits consumed this hour */
  consumedThisHour: number;
  
  /** Total remaining credits (monthly + purchased - consumed) */
  totalRemaining: number;

  /** Backward compatibility aliases */
  /** @deprecated Use monthlyCredits instead */
  monthlyAllowance: number;
  /** @deprecated Use totalRemaining instead */
  remaining: number;
}

export interface AICreditUsageEntry {
  id: string;
  featureId: AICreditFeatureId;
  featureLabel: string;
  credits: number;
  status: "success" | "refunded" | "failed";
  timestamp: number;
  promptSizeKB?: number;
  responseSizeKB?: number;
}

export interface AICreditUsageStats {
  remaining: number;
  monthlyAllowance: number;
  consumedToday: number;
  consumedThisMonth: number;
  /** Credits spent per feature this month */
  perFeature: Record<AICreditFeatureId, number>;
  /** Average daily usage over the last 30 days */
  averageDailyUsage: number;
  /** Estimated days remaining based on average usage */
  estimatedDaysRemaining: number;
  /** Recent AI requests */
  recentRequests: AICreditUsageEntry[];
  /** Monthly credit graph data (last 30 days) */
  monthlyGraph: { day: string; credits: number }[];
}

export interface CreatorAIUsage {
  quizGeneration: number;
  questionImprovement: number;
  testCaseGeneration: number;
  difficultyAnalysis: number;
  reportGeneration: number;
  totalThisMonth: number;
}

export interface AICreditPurchase {
  packId: string;
  packName: string;
  credits: number;
  price: number;
  timestamp: number;
}

export interface FairUsageStatus {
  requestsThisHour: number;
  requestsThisDay: number;
  concurrentRequests: number;
  maxPerHour: number;
  maxPerDay: number;
  maxConcurrent: number;
  isRateLimited: boolean;
  retryAfterMs?: number;
}

export interface AbuseDetectionStatus {
  isFlagged: boolean;
  activeRules: string[];
  action: "none" | "slow" | "captcha" | "notify" | "escalate";
  message?: string;
}