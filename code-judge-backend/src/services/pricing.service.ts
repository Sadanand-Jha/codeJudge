// Public pricing catalog. Reads the same plan/price/entitlement rows edited in
// /platform and exposes active, public plans plus active one-time credit packs.
import { pool } from "../config/database.ts";
import type { Request } from "express";
import {
  getCurrencyMinorUnitExponent,
  resolveCountryPricing,
} from "./countryPricing.service.ts";

export interface PublicPlan {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  cta: string | null;
  offer: string | null;
  featured: boolean;
  discountBadge: string | null;
  trialDays: number;
  price: number;
  originalPrice: number | null;
  currency: string;
  prices: Array<{
    id: number;
    billingPeriod: "monthly" | "quarterly" | "yearly" | "lifetime" | "custom_days";
    customDays: number | null;
    amount: number;
    originalPrice: number | null;
    currency: string;
  }>;
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
  countryPricing: Awaited<ReturnType<typeof resolveCountryPricing>>;
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

function discountBadge(override: unknown, amount: number, mrp: unknown): string | null {
  const manual = typeof override === "string" ? override.trim() : "";
  if (manual) return manual;
  const original = mrp == null ? 0 : numberValue(mrp);
  if (original <= amount || original <= 0) return null;
  return `${Math.round((1 - amount / original) * 100)}% off`;
}

export class PricingService {
  async getPublicCatalog(
    userId: string | null = null,
    request?: Request
  ): Promise<PublicPricingCatalog> {
    const [planResult, packResult, countryPricing] = await Promise.all([
      pool.query(
        `SELECT p.id, p.slug, p.name, p.description, p.tagline, p.cta, p.offer,
                p.featured, p.discount_badge, p.features, p.trial_days, p.sort_order, p.updated_at,
                pp.amount, pp.mrp_amount, pp.currency,
                COALESCE(active_prices.prices, '[]'::jsonb) AS prices,
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
           SELECT jsonb_agg(
             jsonb_build_object(
               'id', id,
               'billing_period', billing_period,
               'custom_days', custom_days,
               'amount', amount,
               'mrp_amount', mrp_amount,
               'currency', currency
             )
             ORDER BY CASE billing_period
               WHEN 'monthly' THEN 0
               WHEN 'quarterly' THEN 1
               WHEN 'yearly' THEN 2
               WHEN 'lifetime' THEN 3
               ELSE 4
             END, custom_days
           ) AS prices
           FROM plan_prices
           WHERE plan_id = p.id AND is_active = TRUE
         ) active_prices ON TRUE
         LEFT JOIN LATERAL (
           SELECT jsonb_object_agg(key, value) AS entitlements
           FROM plan_entitlements
           WHERE plan_id = p.id
         ) e ON TRUE
         WHERE p.status = 'active'
           AND (p.is_public = TRUE OR p.is_default_free = TRUE)
         ORDER BY p.sort_order ASC, p.id ASC`
      ),
      pool.query(
        `SELECT code, name, price_inr, credits, validity_days, description,
                is_popular, cta, sort_order
         FROM ai_credit_packs
         WHERE is_active = TRUE
         ORDER BY sort_order ASC, id ASC`
      ),
      resolveCountryPricing(userId, request),
    ]);

    const plans: PublicPlan[] = planResult.rows.map((row) => {
      const entitlements = (row.entitlements ?? {}) as Record<string, unknown>;
      const prices: PublicPlan["prices"] = (Array.isArray(row.prices) ? row.prices : []).map((price: {
        id: unknown;
        billing_period: PublicPlan["prices"][number]["billingPeriod"];
        custom_days: unknown;
        amount: unknown;
        mrp_amount: unknown;
        currency: unknown;
      }) => {
        const currency = String(price.currency ?? row.currency ?? "INR");
        return {
          id: numberValue(price.id),
          billingPeriod: price.billing_period,
          customDays: price.custom_days == null ? null : numberValue(price.custom_days),
          amount:
            numberValue(price.amount) /
            10 ** getCurrencyMinorUnitExponent(currency),
          originalPrice:
            price.mrp_amount == null
              ? null
              : numberValue(price.mrp_amount) /
                10 ** getCurrencyMinorUnitExponent(currency),
          currency,
        };
      });
      const monthlyPrices = prices.filter((price) => price.billingPeriod === "monthly");
      const regionalElevate = ["pro", "elevate"].includes(String(row.slug));
      if (regionalElevate && monthlyPrices.length > 0) {
        monthlyPrices[0] = {
          ...monthlyPrices[0],
          amount: countryPricing.amount,
          originalPrice: null,
          currency: countryPricing.currency,
        };
      }
      const primaryPrice = regionalElevate
        ? monthlyPrices[0]
        : prices.find((price) => price.billingPeriod === "monthly") ?? prices[0];
      return {
        id: numberValue(row.id),
        slug: String(row.slug),
        name: String(row.name),
        description: row.description == null ? null : String(row.description),
        tagline: row.tagline == null ? null : String(row.tagline),
        cta: row.cta == null ? null : String(row.cta),
        offer: row.offer == null ? null : String(row.offer),
        featured: row.featured === true,
        discountBadge: regionalElevate
          ? null
          : discountBadge(row.discount_badge, numberValue(row.amount), row.mrp_amount),
        trialDays: numberValue(row.trial_days),
        price:
          primaryPrice?.amount ??
          numberValue(row.amount) /
            10 ** getCurrencyMinorUnitExponent(String(row.currency ?? "INR")),
        originalPrice:
          regionalElevate
            ? null
            : primaryPrice?.originalPrice ?? null,
        currency: primaryPrice?.currency ?? String(row.currency ?? "INR"),
        prices: regionalElevate ? monthlyPrices : prices,
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
      countryPricing,
      updatedAt:
        updatedCandidates.length > 0
          ? new Date(Math.max(...updatedCandidates)).toISOString()
          : null,
    };
  }

  async getPageContent(): Promise<Record<string, string>> {
    const result = await pool.query(`SELECT key, value FROM pricing_page_content`);
    return Object.fromEntries(
      (result.rows as Array<{ key: string; value: string }>).map((row) => [row.key, row.value])
    );
  }
}

export const pricingService = new PricingService();
