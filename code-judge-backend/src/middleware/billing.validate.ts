// Validation for the Razorpay checkout endpoints.
//
// Amounts are deliberately not accepted from the client: the server resolves
// the pack/plan price from the database. `amount_paise` is accepted only so
// older clients can keep sending it.

import { z } from "zod";

const couponField = z
  .string()
  .trim()
  .min(1, "Coupon code is empty")
  .max(64, "Coupon code is too long")
  .optional()
  .nullable();

const currencyField = z
  .string()
  .trim()
  .length(3, "Currency must be a 3-letter code")
  .optional()
  .nullable();

const packKeyField = z.union([
  z.number().int().positive(),
  z.string().trim().min(1).max(40),
]);

const planIdField = z.union([
  z.number().int().positive(),
  z
    .string()
    .trim()
    .regex(/^\d+$/, "plan_id must be a number")
    .transform((value) => Number(value)),
]);

const orderKeyField = z.union([
  z.number().int().positive().transform((value) => String(value)),
  z.string().trim().min(1).max(40),
]);

export const createCreditOrderSchema = z.object({
  pack_id: packKeyField,
  coupon: couponField,
  coupon_code: couponField,
  currency: currencyField,
  // Ignored, but tolerated for compatibility with the current client.
  amount_paise: z.number().int().nonnegative().optional(),
});

export const createPlanOrderSchema = z
  .object({
    plan_id: planIdField.optional(),
    plan_slug: z.string().trim().min(1).max(120).optional(),
    coupon: couponField,
    coupon_code: couponField,
    currency: currencyField,
  })
  .refine((value) => Boolean(value.plan_id || value.plan_slug), {
    message: "plan_id or plan_slug is required",
    path: ["plan_id"],
  });

export const verifyOrderSchema = z.object({
  order_id: orderKeyField,
  razorpay_payment_id: z.string().trim().min(1).max(120),
  razorpay_order_id: z.string().trim().min(1).max(120).optional().nullable(),
  razorpay_signature: z.string().trim().min(1).max(255),
  pack_id: packKeyField.optional().nullable(),
});


const optionalText = z.string().trim().max(120).optional().nullable();

export const suggestionQuerySchema = z
  .object({
    plan_id: planIdField.optional(),
    plan_slug: z.string().trim().min(1).max(120).optional(),
    pack_id: packKeyField.optional(),
    pack: packKeyField.optional(),
  })
  .refine((value) => Boolean(value.plan_id || value.plan_slug || value.pack_id || value.pack), {
    message: "plan_id, plan_slug, or pack_id is required",
    path: ["plan_id"],
  });

export const createBundleOrderSchema = z.object({
  bundle_id: planIdField,
  coupon: couponField,
  coupon_code: couponField,
  currency: currencyField,
});

export const checkoutSuggestionEventSchema = z.object({
  event: z.enum([
    "suggestion_shown",
    "suggestion_accepted",
    "suggestion_declined",
    "switch_back",
    "purchase_completed",
  ]),
  suggestion_type: z.enum(["A", "B"]).optional().nullable(),
  source_product_id: optionalText,
  product_id: optionalText,
  plan_code: optionalText,
  session_id: optionalText,
});
