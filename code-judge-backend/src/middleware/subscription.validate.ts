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
  tax_inclusive: z.boolean().optional(),
  gateway_price_id: z.string().max(120).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const createPlanBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
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
  is_public: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  trial_days: z.number().int().min(0).max(365).optional(),
  prices: z.array(planPriceSchema).max(10).optional(),
  entitlements: entitlementMapSchema.optional(),
  migrateSubscribers: z.boolean().optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
});

export const archivePlanBodySchema = z.object({
  strategy: z.enum(["migrate", "run_until_expiry"]).optional(),
  migrationTargetPlanId: z.number().int().positive().optional(),
});

export const reorderPlansBodySchema = z.object({
  planIds: z.array(z.number().int().positive()).min(1).max(200),
});
