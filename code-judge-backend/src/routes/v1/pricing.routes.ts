// Public pricing catalog (plans + credit packs). Mounted before the v1
// authentication guard because marketing pages are anonymous.
import { Router } from "express";
import { getPricingContentHandler, getPublicPricingHandler } from "../../controllers/pricing.controller.ts";

const router = Router();

router.get("/", getPublicPricingHandler);
router.get("/content", getPricingContentHandler);

export default router;
