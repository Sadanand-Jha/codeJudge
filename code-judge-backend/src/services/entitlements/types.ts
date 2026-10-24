export type PlanStatus = "trial" | "active" | "expiring" | "expired";

export type BadgeTier = "free" | "basic" | "pro";

export type BadgeState = "default" | "trial" | "expiring" | "expired";

export type EntitlementErrorCode =
  | "PLAN_EXPIRED"
  | "QUIZ_LIMIT_REACHED"
  | "ROOM_LIMIT_REACHED"
  | "ROOM_MEMBER_LIMIT"
  | "NO_AI_CREDITS"
  | "EMAIL_DAILY_LIMIT"
  | "FEATURE_LOCKED";

export type PlanFeature = "leaderboard" | "customBranding" | "removeWatermark";

export interface MonthlyPlan {
  id: number;
  code: string;
  name: string;
  priceInr: number;
  mrpInr: number;
  trialDays: number;
  quizzesPerMonth: number;
  roomsLimit: number;
  membersPerRoom: number;
  aiCreditsPerMonth: number;
  emailsPerDay: number;
  analyticsLevel: string;
  customBranding: boolean;
  removeWatermark: boolean;
  tierRank: number;
  validityDays: number;
  isActive: boolean;
}

export interface PlanOrder {
  id: number;
  userId: number;
  planId: number;
  startsAt: Date;
  expiresAt: Date;
  validityDays: number;
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  isActive: boolean;
  status: string;
  createdAt: Date;
  plan: MonthlyPlan;
}

export interface CreditOrder {
  id: number;
  expiresAt: Date;
  remaining: number;
}

export interface CreditSummary {
  totalRemaining: number;
  nearestExpiry: { amount: number; at: Date } | null;
}

export interface EntitlementSnapshot {
  userId: number;
  now: Date;
  trialStartedAt: Date | null;
  createdAt: Date | null;
  freePlan: MonthlyPlan | null;
  activePlanOrder: PlanOrder | null;
  credits: CreditSummary;
  quizzesUsed: number;
  emailsToday: number;
}

export interface PlanEntitlement {
  id: number | null;
  code: string;
  name: string;
  status: PlanStatus;
  startsAt: string | null;
  expiresAt: string | null;
  daysLeft: number;
}

export interface EntitlementLimits {
  quizzes: number;
  rooms: number;
  membersPerRoom: number;
  aiCredits: number;
  emailsPerDay: number;
}

export interface EntitlementUsage {
  quizzesUsed: number;
  quizzesRemaining: number;
  emailsToday: number;
  emailsRemainingToday: number;
  aiCreditsRemaining: number;
  creditsExpiringSoon: { amount: number; at: string } | null;
}

export interface EntitlementFeatures {
  leaderboard: boolean;
  customBranding: boolean;
  removeWatermark: boolean;
}

export interface EntitlementBadge {
  tier: BadgeTier;
  state: BadgeState;
  label: string;
}

export interface Entitlements {
  userId: number;
  plan: PlanEntitlement;
  limits: EntitlementLimits;
  usage: EntitlementUsage;
  features: EntitlementFeatures;
  badge: EntitlementBadge;
  isPaid: boolean;
  computedAt: string;
}

export interface PlanPlacement {
  startsAt: Date;
  expiresAt: Date;
  deactivatePrevious: boolean;
  changeType: "new" | "renewal" | "upgrade" | "downgrade";
}

export interface CreditAllocation {
  orderId: number;
  amount: number;
}

export interface CreditAllocationResult {
  allocations: CreditAllocation[];
  remaining: number;
  available: number;
}

export interface EntitlementErrorDetails {
  limit?: number | null;
  used?: number | null;
  remaining?: number | null;
  requiredPlan?: string | null;
  upgradeUrl?: string | null;
}

import type { Pool, PoolClient } from "pg";

export type Queryable = Pool | PoolClient;
