/**
 * Advertising domain types for Creator Studio — "Advertise".
 *
 * Every figure in the UI originates from these types so that real backend
 * data can be swapped in without touching component markup.
 */

/** A campaign the creator can pause / run / revert to draft. */
export type CampaignStatus = "active" | "paused" | "completed" | "draft";

export type CampaignObjectiveId = "visibility" | "students" | "launch";

export interface CampaignObjective {
  id: CampaignObjectiveId;
  label: string;
  short: string;
  description: string;
}

/** A creator product (test series / course / quiz) eligible for promotion. */
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
  /** Eligible to be advertised (published & verifiable demand). */
  eligible: boolean;
  /** Why the matching engine thinks this is a good fit to promote. */
  recommendedAudience: string[];
  tags: string[];
}

/** Budget + duration chosen for a campaign. */
export interface CampaignBudget {
  daily: number;
  total: number;
  durationDays: number;
  /** 3 | 7 | 14 | custom */
  durationPreset: "3" | "7" | "14" | "custom";
}

export interface AdCampaign {
  id: string;
  productId: string;
  productName: string;
  productKindLabel: string;
  objectiveId: CampaignObjectiveId;
  status: CampaignStatus;
  dailyBudget: number;
  totalBudget: number;
  startDate: string;
  endDate: string;
  spent: number;
  impressions: number;
  reach: number;
  clicks: number;
  visits: number;
  enrollments: number;
  revenueAttributed: number;
  refunds: number;
  ctrPct: number;
  conversionPct: number;
  costPerEnrollment: number;
  roas: number;
  createdAt: string;
}

/** Daily spend/impressions point for the analytics area chart. */
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
  /** 0..1 — how strong the creator's own signal currently is. */
  strength: number;
  hint?: string;
}

export interface RecommendedAudienceProfile {
  label: string;
  matchPct: number;
}