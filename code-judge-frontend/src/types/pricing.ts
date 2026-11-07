export type PricingBillingPeriod = "monthly" | "quarterly" | "yearly" | "lifetime" | "custom_days";

export interface PricingPlan {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  cta: string | null;
  offer: string | null;
  discountBadge: string | null;
  featured: boolean;
  trialDays: number;
  price: number;
  originalPrice: number | null;
  currency: string;
  prices: Array<{
    id: number;
    billingPeriod: PricingBillingPeriod;
    customDays: number | null;
    amount: number;
    originalPrice: number | null;
    currency: string;
  }>;
  billingPeriod?: PricingBillingPeriod;
  customDays?: number | null;
  quizzes: number;
  rooms: number;
  credits: number;
  features: string[];
  sortOrder: number;
}

export interface PricingCreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  cta: string;
  blurb: string;
  popular: boolean;
  validityMonths: number;
  sortOrder: number;
}

export interface PricingCatalog {
  plans: PricingPlan[];
  creditPacks: PricingCreditPack[];
  updatedAt: string | null;
  countryPricing?: {
    countryCode: string | null;
    countryName: string;
    currency: string;
    amount: number;
    amountMinor: number;
    minorUnitExponent: number;
    version: number;
    isFallback: boolean;
    checkoutAvailable: boolean;
    source: "subscription" | "payment" | "ip" | "mobile" | "fallback";
  };
}

export interface PlatformCreditPack {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  credits: number;
  validity_days: number;
  description: string | null;
  is_popular: boolean;
  save_percent: number;
  is_active: boolean;
  cta: string | null;
  sort_order: number;
  created_at: string;
}
