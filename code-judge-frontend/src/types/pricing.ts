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
