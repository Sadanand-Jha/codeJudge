// Public pricing catalog (plans + credit packs). Mounted before the v1
// authentication guard because marketing pages are anonymous.
import { Router } from "express";
import { getPublicPricingHandler } from "../../controllers/pricing.controller.ts";

const router = Router();

router.get("/", getPublicPricingHandler);

export default router;
