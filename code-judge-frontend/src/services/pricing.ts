import apiClient from "@/lib/axios";
import type {
  PricingCatalog,
  PricingBillingPeriod,
  PricingCreditPack,
  PricingPlan,
} from "@/types/pricing";

export type { PricingBillingPeriod, PricingCatalog, PricingCreditPack, PricingPlan };

/** Neutral placeholder used while loading and when the catalog is unavailable. */
export const EMPTY_PRICING: PricingCatalog = {
  plans: [],
  creditPacks: [],
  updatedAt: null,
};

function isPricingCatalog(value: unknown): value is PricingCatalog {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PricingCatalog>;
  return Array.isArray(candidate.plans) && Array.isArray(candidate.creditPacks);
}

function readCatalog(value: unknown): PricingCatalog {
  if (!isPricingCatalog(value)) {
    throw new Error("The pricing catalog returned an invalid response.");
  }
  return value;
}

/** Client-side catalog fetch (used by creator billing screens). */
export async function getPricingCatalog(): Promise<PricingCatalog> {
  const response = await apiClient.get<unknown>("/v1/pricing");
  return readCatalog(response.data);
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

export function formatPricingAmount(value: number, currency = "INR"): string {
  try {
    const digits = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

export function formatBillingPeriod(period: PricingBillingPeriod, customDays?: number | null): string {
  switch (period) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
    case "lifetime":
      return "Lifetime";
    case "custom_days":
      return `${customDays ?? 30} days`;
  }
}
