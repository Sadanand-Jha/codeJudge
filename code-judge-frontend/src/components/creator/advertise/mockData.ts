import type { AdCampaign, AdCreditBalance, AdProduct, ReachPoint } from "./types";
import { budgetToReach } from "./types";

/**
 * MOCK DATA — Advertise (Creator Studio)
 * Reach-based model: budget → targetedReach
 */

export const AD_CREDITS: AdCreditBalance = {
  available: 4200,
  pending: 1800,
  lifetimeFunded: 6000,
};

export const ELIGIBLE_PRODUCTS: AdProduct[] = [
  {
    id: "p_dsa",
    name: "DSA Placement Test Series",
    kind: "series",
    kindLabel: "Test Series",
    testCount: 12,
    rating: 4.8,
    attempts: 2431,
    price: 299,
    eligible: true,
    recommendedAudience: ["Computer Science", "Placement Preparation", "DSA", "2nd–4th Year Students"],
    tags: ["DSA", "Software", "Placement"],
    description: "Prepare for technical placements with structured DSA assessments.",
  },
  {
    id: "p_jee",
    name: "JEE Advanced 2026 Crash Course",
    kind: "course",
    kindLabel: "Course",
    testCount: 18,
    rating: 4.7,
    attempts: 5120,
    price: 1499,
    eligible: true,
    recommendedAudience: ["JEE Advanced", "JEE Main qualifiers", "Class 12 science"],
    tags: ["JEE", "Physics", "Maths"],
    description: "Intensive JEE Advanced revision with full-length mocks.",
  },
  {
    id: "p_neet",
    name: "NEET UG Biology Master Series",
    kind: "series",
    kindLabel: "Test Series",
    testCount: 12,
    rating: 4.9,
    attempts: 2890,
    price: 899,
    eligible: true,
    recommendedAudience: ["NEET UG", "Class 11 & 12 biology", "Medical aspirants"],
    tags: ["NEET", "Biology"],
    description: "Master NEET Biology with chapter-wise and full syllabus tests.",
  },
  {
    id: "p_cat",
    name: "CAT Quant & DILR Sprint",
    kind: "course",
    kindLabel: "Course",
    testCount: 15,
    rating: 4.6,
    attempts: 1620,
    price: 599,
    eligible: true,
    recommendedAudience: ["MBA aspirants", "CAT", "Working professionals"],
    tags: ["CAT", "Quant", "DILR"],
    description: "30-day Quant & DILR sprint for CAT aspirants.",
  },
  {
    id: "p_ssc",
    name: "SSC CGL Tier 1 Booster",
    kind: "series",
    kindLabel: "Test Series",
    testCount: 8,
    rating: 4.4,
    attempts: 412,
    price: 699,
    eligible: false,
    recommendedAudience: ["SSC CGL", "Government exam aspirants"],
    tags: ["SSC", "GK"],
    description: "Tier 1 booster with sectional mocks.",
  },
  {
    id: "p_bank",
    name: "IBPS PO Prelims Practice",
    kind: "series",
    kindLabel: "Test Series",
    testCount: 10,
    rating: 4.5,
    attempts: 876,
    price: 499,
    eligible: false,
    recommendedAudience: ["Banking", "IBPS PO", "PO prelims"],
    tags: ["Banking", "Reasoning"],
    description: "Prelims practice with speed drills.",
  },
];

// Helper to build campaign with correct reach numbers
function mkCampaign(c: Omit<AdCampaign, "targetedReach" | "costPerVisit" | "costPerEnrollment" | "completionPct" | "conversionPct" | "ctrPct" | "roas"> & Partial<Pick<AdCampaign, "targetedReach" | "costPerVisit">>): AdCampaign {
  const targetedReach = c.targetedReach ?? budgetToReach(c.budget);
  const reach = c.reach;
  const completionPct = targetedReach > 0 ? Math.min(100, Math.round((reach / targetedReach) * 100)) : 0;
  const conversionPct = c.visits > 0 ? Number(((c.enrollments / c.visits) * 100).toFixed(1)) : 0;
  const ctrPct = reach > 0 ? Number(((c.visits / reach) * 100).toFixed(1)) : 0;
  const costPerVisit = c.visits > 0 ? Math.round(c.spent / c.visits) : 0;
  const costPerEnrollment = c.enrollments > 0 ? Math.round(c.spent / c.enrollments) : 0;
  const roas = c.spent > 0 ? Number((c.revenueAttributed / c.spent).toFixed(1)) : 0;
  return {
    ...c,
    targetedReach,
    completionPct,
    conversionPct,
    ctrPct,
    costPerVisit,
    costPerEnrollment,
    roas,
  } as AdCampaign;
}

export const CAMPAIGNS: AdCampaign[] = [
  mkCampaign({
    id: "c1",
    productId: "p_dsa",
    productName: "DSA Placement Series",
    productKindLabel: "Test Series",
    status: "active",
    budget: 2500,
    spent: 1240,
    reach: 398,
    visits: 214,
    enrollments: 37,
    revenueAttributed: 11063,
    refunds: 1,
    startDate: "2026-08-05",
    endDate: "Until reach completed",
    durationPreset: "until",
    durationLabel: "Until reach is completed",
    createdAt: "2026-08-05",
  }),
  mkCampaign({
    id: "c2",
    productId: "p_jee",
    productName: "JEE Advanced 2026 Crash Course",
    productKindLabel: "Course",
    status: "active",
    budget: 5000,
    spent: 3100,
    reach: 1040,
    visits: 612,
    enrollments: 74,
    revenueAttributed: 110926,
    refunds: 1,
    startDate: "2026-08-10",
    endDate: "Until reach completed",
    durationPreset: "until",
    durationLabel: "Until reach is completed",
    createdAt: "2026-08-10",
  }),
  mkCampaign({
    id: "c3",
    productId: "p_neet",
    productName: "NEET UG Biology Master Series",
    productKindLabel: "Test Series",
    status: "paused",
    budget: 1000,
    spent: 390,
    visits: 92,
    reach: 118,
    enrollments: 12,
    revenueAttributed: 10788,
    refunds: 0,
    startDate: "2026-07-20",
    endDate: "Paused",
    durationPreset: "7",
    durationLabel: "7 Days",
    createdAt: "2026-07-20",
  }),
  mkCampaign({
    id: "c4",
    productId: "p_cat",
    productName: "CAT Quant & DILR Sprint",
    productKindLabel: "Course",
    status: "completed",
    budget: 2500,
    spent: 2500,
    reach: 800,
    visits: 430,
    enrollments: 62,
    revenueAttributed: 37138,
    refunds: 2,
    startDate: "2026-06-01",
    endDate: "2026-06-18",
    durationPreset: "until",
    durationLabel: "Until reach is completed",
    createdAt: "2026-06-01",
  }),
  mkCampaign({
    id: "c5",
    productId: "p_ssc",
    productName: "SSC CGL Tier 1 Booster",
    productKindLabel: "Test Series",
    status: "draft",
    budget: 500,
    spent: 0,
    reach: 0,
    visits: 0,
    enrollments: 0,
    revenueAttributed: 0,
    refunds: 0,
    startDate: "—",
    endDate: "—",
    durationPreset: "until",
    durationLabel: "Until reach is completed",
    createdAt: "2026-08-18",
  }),
];

// Daily reach series for active DSA campaign (timeline chart)
export const DSA_REACH_SERIES: ReachPoint[] = [
  { date: "2026-08-05", label: "Aug 5", reach: 42, visits: 22, enrollments: 3 },
  { date: "2026-08-06", label: "Aug 6", reach: 48, visits: 28, enrollments: 5 },
  { date: "2026-08-07", label: "Aug 7", reach: 46, visits: 24, enrollments: 4 },
  { date: "2026-08-08", label: "Aug 8", reach: 58, visits: 33, enrollments: 6 },
  { date: "2026-08-09", label: "Aug 9", reach: 40, visits: 19, enrollments: 2 },
  { date: "2026-08-10", label: "Aug 10", reach: 62, visits: 36, enrollments: 7 },
  { date: "2026-08-11", label: "Aug 11", reach: 55, visits: 29, enrollments: 5 },
  { date: "2026-08-12", label: "Aug 12", reach: 47, visits: 23, enrollments: 5 },
];

// Backwards compat: some charts still expect SpendPoint — map reach to old shape for reuse
export const DSA_SPEND_SERIES = DSA_REACH_SERIES.map((r) => ({
  date: r.date,
  label: r.label,
  spend: Math.round((r.reach / 800) * 2500 / 8),
  impressions: r.reach * 3,
  clicks: r.visits,
}));

/** Why this creator's DSA product ranks well right now. */
export const VISIBILITY_FACTORS = [
  { label: "Student ratings", strength: 0.95, hint: "4.8 ★ from 1,214 ratings" },
  { label: "Low refund rate", strength: 0.9, hint: "2.1% last 90 days" },
  { label: "High student engagement", strength: 0.88, hint: "Avg 4.6 tests attempted" },
  { label: "Sales & genuine demand", strength: 0.86, hint: "2,431 attempts · 880 paid" },
  { label: "Product relevance", strength: 0.9, hint: "Matched to placement audience" },
  { label: "Campaign budget", strength: 0.6, hint: "Healthy daily reach" },
];

export const QUALITY_SCORE = 88;

/** Eligible audience size for preview (spec: 18,420). */
export const ELIGIBLE_AUDIENCE_SIZE = 18420;

/** Skills / categories selectors — minimal set. */
export const AUDIENCE_CATEGORIES = ["Computer Science", "Electronics", "Mechanical", "MBA", "Medical", "School (9-12)"];
export const AUDIENCE_EXAMS = ["Placement Preparation", "JEE", "NEET", "CAT", "GATE", "SSC / Banking"];
export const AUDIENCE_SKILLS = ["DSA", "Aptitude", "System Design", "Web Development", "Biology", "Quant"];
export const AUDIENCE_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
export const AUDIENCE_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate", "Any"];
export const AUDIENCE_LANGUAGES = ["English", "Hindi", "English + Hindi"];
export const AUDIENCE_INTERESTS = ["DSA", "Placements", "Competitive Programming", "Aptitude", "Projects"];
