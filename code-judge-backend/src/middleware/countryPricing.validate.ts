import { z } from "zod";

export const countryPricingBodySchema = z.object({
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  amountMajor: z.number().finite().min(0).max(10000000),
  isActive: z.boolean(),
});
