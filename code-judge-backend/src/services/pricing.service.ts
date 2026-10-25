// Public pricing catalog. Reads the same plan/price/entitlement rows edited in
// /platform, but exposes only active, public, paid plans (no ₹0 plan) and
// active one-time credit packs.
import { pool } from "../config/database.ts";

export interface PublicPlan {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  cta: string | null;
  offer: string | null;
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

export interface PublicCreditPack {
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

export interface PublicPricingCatalog {
  plans: PublicPlan[];
  creditPacks: PublicCreditPack[];
  updatedAt: string | null;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function entitlementNumber(
  entitlements: Record<string, unknown>,
  key: string,
  fallback = 0
): number {
  return numberValue(entitlements[key], fallback);
}

export class PricingService {
  async getPublicCatalog(): Promise<PublicPricingCatalog> {
    const [planResult, packResult] = await Promise.all([
      pool.query(
        `SELECT p.id, p.slug, p.name, p.description, p.tagline, p.cta, p.offer,
                p.featured, p.features, p.trial_days, p.sort_order, p.updated_at,
                pp.amount, pp.mrp_amount, pp.currency,
                COALESCE(e.entitlements, '{}'::jsonb) AS entitlements
         FROM plans p
         JOIN LATERAL (
           SELECT amount, mrp_amount, currency
           FROM plan_prices
           WHERE plan_id = p.id
             AND billing_period = 'monthly'
             AND is_active = TRUE
           ORDER BY id DESC
           LIMIT 1
         ) pp ON TRUE
         LEFT JOIN LATERAL (
           SELECT jsonb_object_agg(key, value) AS entitlements
           FROM plan_entitlements
           WHERE plan_id = p.id
         ) e ON TRUE
         WHERE p.status = 'active'
           AND p.is_public = TRUE
           AND p.is_default_free = FALSE
           AND pp.amount > 0
         ORDER BY p.sort_order ASC, p.id ASC`
      ),
      pool.query(
        `SELECT code, name, price_inr, credits, validity_days, description,
                is_popular, cta, sort_order
         FROM ai_credit_packs
         WHERE is_active = TRUE
         ORDER BY sort_order ASC, id ASC`
      ),
    ]);

    const plans: PublicPlan[] = planResult.rows.map((row) => {
      const entitlements = (row.entitlements ?? {}) as Record<string, unknown>;
      const isBasic = row.slug === "basic";
      return {
        id: numberValue(row.id),
        slug: String(row.slug),
        name: String(row.name),
        description: row.description == null ? null : String(row.description),
        tagline: row.tagline == null ? null : String(row.tagline),
        cta: row.cta == null ? null : String(row.cta),
        offer: row.offer == null ? null : String(row.offer),
        featured: row.featured === true,
        trialDays: isBasic ? numberValue(row.trial_days) : 0,
        price: numberValue(row.amount) / 100,
        originalPrice:
          row.mrp_amount == null ? null : numberValue(row.mrp_amount) / 100,
        currency: String(row.currency ?? "INR"),
        quizzes: entitlementNumber(entitlements, "max_quizzes"),
        rooms: entitlementNumber(entitlements, "max_rooms", 1),
        credits: entitlementNumber(entitlements, "ai_credits_per_month"),
        features: stringArray(row.features),
        sortOrder: numberValue(row.sort_order),
      };
    });

    const creditPacks: PublicCreditPack[] = packResult.rows.map((row) => {
      const validityDays = Math.max(1, numberValue(row.validity_days, 180));
      return {
        id: String(row.code),
        name: String(row.name),
        credits: numberValue(row.credits),
        price: numberValue(row.price_inr),
        cta: String(row.cta ?? `Buy ${row.name}`),
        blurb: String(row.description ?? ""),
        popular: row.is_popular === true,
        validityMonths: Math.max(1, Math.round(validityDays / 30)),
        sortOrder: numberValue(row.sort_order),
      };
    });

    const updatedCandidates = planResult.rows
      .map((row) => (row.updated_at ? new Date(row.updated_at).getTime() : 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    return {
      plans,
      creditPacks,
      updatedAt:
        updatedCandidates.length > 0
          ? new Date(Math.max(...updatedCandidates)).toISOString()
          : null,
    };
  }
}

export const pricingService = new PricingService();
