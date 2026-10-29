import apiClient from "@/lib/axios";
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

const PUBLIC_BACKEND_URL = "https://api.quizsupport.com";

function pricingUrls(path: string): string[] {
  const urls = new Set<string>();
  if (process.env.PRICING_API_URL) {
    urls.add(`${process.env.PRICING_API_URL.replace(/\/$/, "")}/api/v1${path}`);
  }
  urls.add(`${BACKEND_URL.replace(/\/$/, "")}/api/v1${path}`);
  urls.add(`${PUBLIC_BACKEND_URL}/api/v1${path}`);
  return [...urls];
}

async function fetchPricing(path: string): Promise<Response | null> {
  for (const url of pricingUrls(path)) {
    try {
      const response = await fetch(url, { next: { revalidate: 60 } });
      if (response.ok) return response;
    } catch {
      // Try the next backend origin.
    }
  }
  return null;
}

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

/** Server-side catalog fetch for marketing pages. */
export async function getPricingCatalogServer(): Promise<PricingCatalog> {
  try {
    const response = await fetchPricing("/pricing");
    if (!response) return EMPTY_PRICING;
    const payload = (await response.json()) as { data?: unknown };
    return readCatalog(payload.data);
  } catch {
    return EMPTY_PRICING;
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

export function formatPricingAmount(value: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

export async function getPricingContentServer(): Promise<Record<string, string>> {
  try {
    const response = await fetchPricing("/pricing/content");
    if (!response) return {};
    const payload = (await response.json()) as { data?: { content?: unknown } };
    const content = payload.data?.content;
    if (!content || typeof content !== "object") return {};
    return Object.fromEntries(
      Object.entries(content as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}
