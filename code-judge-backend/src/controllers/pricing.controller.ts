// Public pricing catalog used by the marketing pages and creator billing UI.
// Values are owned by /platform and never hardcoded in the frontend.
import type { Request, Response } from "express";
import { pricingService } from "../services/pricing.service.ts";

export const getPublicPricingHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const catalog = await pricingService.getPublicCatalog();
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.status(200).json({ success: true, data: catalog });
  } catch (error) {
    console.error("Public pricing: failed to load catalog", error);
    res.status(503).json({ success: false, message: "Pricing is temporarily unavailable." });
  }
};
