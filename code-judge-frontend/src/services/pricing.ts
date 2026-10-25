import apiClient from "@/lib/axios";
import { CREATOR_PLANS } from "@/config/creatorPlans";
import { CREDIT_PURCHASE_PACKS } from "@/config/aiCredits";
import type {
  PricingCatalog,
  PricingCreditPack,
  PricingPlan,
} from "@/types/pricing";

export type { PricingCatalog, PricingCreditPack, PricingPlan };

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://api.quizsupport.com");

/** Local safety net only — the backend catalog is the source of truth. */
export const FALLBACK_PRICING: PricingCatalog = {
  plans: CREATOR_PLANS.filter((plan) => plan.price > 0).map((plan, index) => ({
    id: index + 1,
    slug: plan.id,
    name: plan.name,
    description: null,
    tagline: plan.tagline,
    cta: plan.cta,
    offer: plan.offer ?? null,
    featured: plan.featured === true,
    trialDays: plan.id === "basic" ? (plan.trialDays ?? 7) : 0,
    price: plan.price,
    originalPrice: plan.originalPrice ?? null,
    currency: "INR",
    quizzes: plan.quizzes,
    rooms: plan.rooms,
    credits: plan.credits,
    features: plan.features,
    sortOrder: index,
  })),
  creditPacks: CREDIT_PURCHASE_PACKS.map((pack, index) => ({
    id: pack.id,
    name: pack.name,
    credits: pack.credits,
    price: pack.price,
    cta: pack.cta,
    blurb: pack.blurb,
    popular: pack.popular === true,
    validityMonths: pack.validityMonths,
    sortOrder: index,
  })),
  updatedAt: null,
};

function isPricingCatalog(value: unknown): value is PricingCatalog {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PricingCatalog>;
  return Array.isArray(candidate.plans) && Array.isArray(candidate.creditPacks);
}

/** Client-side catalog fetch (used by creator billing screens). */
export async function getPricingCatalog(): Promise<PricingCatalog> {
  try {
    const response = await apiClient.get<PricingCatalog>("/v1/pricing");
    return isPricingCatalog(response.data) ? response.data : FALLBACK_PRICING;
  } catch {
    return FALLBACK_PRICING;
  }
}

/** Server-side catalog fetch for marketing pages. */
export async function getPricingCatalogServer(): Promise<PricingCatalog> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/pricing`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return FALLBACK_PRICING;
    const payload = (await response.json()) as { data?: unknown };
    return isPricingCatalog(payload.data) ? payload.data : FALLBACK_PRICING;
  } catch {
    return FALLBACK_PRICING;
  }
}

export function getPlanBySlug(
  catalog: PricingCatalog,
  slug: string
): PricingPlan | undefined {
  return catalog.plans.find((plan) => plan.slug === slug);
}

export function getCreditPackById(
  catalog: PricingCatalog,
  id: string
): PricingCreditPack | undefined {
  return catalog.creditPacks.find((pack) => pack.id === id);
}

export function getPlanDiscount(plan: PricingPlan): number {
  if (!plan.originalPrice || plan.originalPrice <= plan.price) return 0;
  return Math.round((1 - plan.price / plan.originalPrice) * 100);
}
