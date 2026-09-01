/**
 * Advertising domain types for Creator Studio — "Advertise".
 * Reach-based marketplace promotion model.
 */

export type CampaignStatus = "active" | "paused" | "completed" | "draft";

export type AdProductKind = "series" | "course" | "quiz" | "test";

export interface AdProduct {
  id: string;
  name: string;
  kind: AdProductKind;
  kindLabel: string;
  testCount: number;
  rating: number;
  attempts: number;
  price: number;
  eligible: boolean;
  recommendedAudience: string[];
  tags: string[];
  /** Short description shown in preview */
  description?: string;
}

/** Budget → Reach pricing points (spec). */
export const REACH_PRICE_POINTS: Array<{ budget: number; reach: number }> = [
  { budget: 500, reach: 125 },
  { budget: 1000, reach: 300 },
  { budget: 2500, reach: 800 },
  { budget: 5000, reach: 1700 },
  { budget: 10000, reach: 3250 },
];

export const BUDGET_MIN = 500;
export const BUDGET_MAX = 10000;
export const BUDGET_RECOMMENDED = 2500;

/** Linear interpolation between pricing points. */
export function budgetToReach(budget: number): number {
  const b = Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, Math.round(budget)));
  const pts = REACH_PRICE_POINTS;
  if (b <= pts[0]!.budget) return pts[0]!.reach;
  if (b >= pts[pts.length - 1]!.budget) return pts[pts.length - 1]!.reach;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const c = pts[i + 1]!;
    if (b >= a.budget && b <= c.budget) {
      const t = (b - a.budget) / (c.budget - a.budget);
      return Math.round(a.reach + t * (c.reach - a.reach));
    }
  }
  return pts[0]!.reach;
}

export function formatReach(n: number): string {
  if (n >= 1000) return `~${n.toLocaleString("en-IN")}`;
  return String(n);
}

/** Duration model — pay for reach, not days. */
export type CampaignDurationPreset = "3" | "7" | "until" | "custom";

export interface CampaignDuration {
  preset: CampaignDurationPreset;
  customDays?: number;
  label: string;
}

export const DURATION_OPTIONS: Array<{ id: CampaignDurationPreset; label: string; hint?: string }> = [
  { id: "3", label: "3 Days" },
  { id: "7", label: "7 Days" },
  { id: "until", label: "Until Reach Is Completed", hint: "Recommended" },
  { id: "custom", label: "Custom" },
];

/** Audience — kept intentionally minimal. */
export interface CampaignAudience {
  category: string;
  examGoal: string;
  skills: string[];
  difficulty: string;
  studentLevel: string;
  language: string;
  interests: string[];
}

/** Campaign summary — reach is the primary KPI. */
export interface AdCampaign {
  id: string;
  productId: string;
  productName: string;
  productKindLabel: string;
  status: CampaignStatus;
  /** Total campaign cost = advertising spend (separate from commission). */
  budget: number;
  targetedReach: number;
  /** Delivery */
  spent: number;
  reach: number;
  visits: number;
  enrollments: number;
  revenueAttributed: number;
  refunds: number;
  ctrPct: number;
  conversionPct: number;
  costPerVisit: number;
  costPerEnrollment: number;
  roas: number;
  completionPct: number;
  startDate: string;
  endDate: string;
  durationPreset: CampaignDurationPreset;
  durationLabel: string;
  createdAt: string;
}

/** Daily reach/visit point for timeline chart. */
export interface ReachPoint {
  date: string;
  label: string;
  reach: number;
  visits: number;
  enrollments: number;
}

export interface SpendPoint {
  date: string;
  label: string;
  spend: number;
  impressions: number;
  clicks: number;
}

export interface AdCreditBalance {
  available: number;
  pending: number;
  lifetimeFunded: number;
}

export interface VisibilityFactor {
  label: string;
  strength: number;
  hint?: string;
}

export interface RecommendedAudienceProfile {
  label: string;
  matchPct: number;
}
