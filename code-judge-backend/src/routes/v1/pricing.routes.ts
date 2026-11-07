// Public pricing catalog (plans + credit packs). Mounted before the v1
// authentication guard because marketing pages are anonymous.
import { Router } from "express";
import { optionalAuthenticate } from "../../middleware/auth.ts";
import { getPricingContentHandler, getPublicPricingHandler } from "../../controllers/pricing.controller.ts";

const router = Router();

router.get("/", optionalAuthenticate, getPublicPricingHandler);
router.get("/content", getPricingContentHandler);

export default router;
