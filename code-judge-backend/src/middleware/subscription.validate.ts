// Zod schemas for the /platform subscription-management API. Kept separate
// from validate.ts so the billing surface owns its own contract.
import { z } from "zod";

export const entitlementValueSchema = z.union([
  z.boolean(),
  z.number().int().min(-1), // -1 = unlimited
]);

export const entitlementMapSchema = z.record(entitlementValueSchema);

const billingPeriodSchema = z.enum(["monthly", "quarterly", "yearly", "lifetime", "custom_days"]);

export const planPriceSchema = z.object({
  billing_period: billingPeriodSchema,
  custom_days: z.number().int().positive().nullable().optional(),
  amount: z.number().int().min(0).max(100_000_000),
  mrp_amount: z.number().int().min(0).max(100_000_000).nullable().optional(),
  tax_inclusive: z.boolean().optional(),
  gateway_price_id: z.string().max(120).nullable().optional(),
  is_active: z.boolean().optional(),
});

const planFeaturesSchema = z.array(z.string().trim().min(1).max(200)).max(20);

export const createPlanBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  tagline: z.string().max(300).nullable().optional(),
  cta: z.string().max(80).nullable().optional(),
  offer: z.string().max(160).nullable().optional(),
  discount_badge: z.string().trim().max(40).nullable().optional(),
  featured: z.boolean().optional(),
  features: planFeaturesSchema.optional(),
  status: z.enum(["draft", "active"]).optional(),
  is_public: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  trial_days: z.number().int().min(0).max(365).optional(),
  prices: z.array(planPriceSchema).max(10),
  entitlements: entitlementMapSchema,
});

export const updatePlanBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  tagline: z.string().max(300).nullable().optional(),
  cta: z.string().max(80).nullable().optional(),
  offer: z.string().max(160).nullable().optional(),
  discount_badge: z.string().trim().max(40).nullable().optional(),
  featured: z.boolean().optional(),
  features: planFeaturesSchema.optional(),
  is_public: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  trial_days: z.number().int().min(0).max(365).optional(),
  prices: z.array(planPriceSchema).max(10).optional(),
  entitlements: entitlementMapSchema.optional(),
  migrateSubscribers: z.boolean().optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
});

export const toggleActiveBodySchema = z.object({
  active: z.boolean(),
});

export const restoreVersionBodySchema = z.object({
  versionId: z.number().int().positive(),
});

export const archivePlanBodySchema = z.object({
  strategy: z.enum(["migrate", "run_until_expiry"]).optional(),
  migrationTargetPlanId: z.number().int().positive().optional(),
});

export const reorderPlansBodySchema = z.object({
  planIds: z.array(z.number().int().positive()).min(1).max(200),
});

const creditPackBaseSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(50),
  price_inr: z.number().int().min(0).max(10_000_000),
  credits: z.number().int().positive().max(10_000_000),
  validity_days: z.number().int().positive().max(3650),
  description: z.string().max(255).nullable().optional(),
  is_popular: z.boolean().optional(),
  save_percent: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
  cta: z.string().max(80).nullable().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
});

export const createCreditPackBodySchema = creditPackBaseSchema;
export const updateCreditPackBodySchema = creditPackBaseSchema.partial();

export const reorderPacksBodySchema = z.object({
  packIds: z.array(z.number().int().positive()).min(1).max(200),
});

export const couponBodySchema = z.object({
  code: z.string().trim().min(2).max(64),
  type: z.enum(["percent", "flat", "free_days"]),
  value: z.number().int().positive().max(10_000_000),
  applies_to_plan_ids: z.array(z.number().int().positive()).nullable().optional(),
  max_redemptions: z.number().int().positive().nullable().optional(),
  per_user_limit: z.number().int().positive().max(1000).optional(),
  valid_from: z.string().datetime().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const updateCouponBodySchema = couponBodySchema.partial();

export const contentDraftBodySchema = z.object({
  content: z.record(z.string().trim().min(1).max(80), z.string().max(4000)),
});

export const publishContentBodySchema = z.object({
  keys: z.array(z.string().trim().min(1).max(80)).min(1),
});
