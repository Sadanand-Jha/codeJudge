// /api/v1/platform/subscriptions — owner-only plan catalog management.
// Mounted inside platform.routes.ts (after requireOwner), so every route is
// server-side admin-gated.
import { Router } from "express";
import { validate } from "../../middleware/validate.ts";
import {
  archivePlanBodySchema,
  contentDraftBodySchema,
  couponBodySchema,
  createCreditPackBodySchema,
  createPlanBodySchema,
  publishContentBodySchema,
  reorderPacksBodySchema,
  reorderPlansBodySchema,
  restoreVersionBodySchema,
  toggleActiveBodySchema,
  updateCouponBodySchema,
  updateCreditPackBodySchema,
  updatePlanBodySchema,
} from "../../middleware/subscription.validate.ts";
import { reviewTrialRequestSchema } from "../../middleware/trialRequest.validate.ts";
import {
  activatePlanHandler,
  archivePlanHandler,
  createPlanHandler,
  deletePlanHandler,
  duplicatePlanHandler,
  getEntitlementRegistryHandler,
  getPlanHandler,
  getPlanImpactHandler,
  getPlanVersionsHandler,
  listPlansHandler,
  publishPlanDraftHandler,
  reorderPlansHandler,
  restorePlanVersionHandler,
  savePlanDraftHandler,
  togglePlanActiveHandler,
  updatePlanHandler,
} from "../../controllers/platformSubscription.controller.ts";
import {
  createCreditPackHandler,
  deleteCreditPackHandler,
  getCreditPackVersionsHandler,
  listCreditPacksHandler,
  publishCreditPackDraftHandler,
  reorderCreditPacksHandler,
  restoreCreditPackVersionHandler,
  saveCreditPackDraftHandler,
  toggleCreditPackActiveHandler,
  updateCreditPackHandler,
} from "../../controllers/platformCreditPack.controller.ts";
import {
  createCouponHandler,
  disableCouponHandler,
  getCouponVersionsHandler,
  listCouponsHandler,
  publishCouponDraftHandler,
  restoreCouponVersionHandler,
  saveCouponDraftHandler,
  toggleCouponActiveHandler,
} from "../../controllers/platformCoupon.controller.ts";
import {
  getPageContentVersionsHandler,
  listPageContentHandler,
  publishPageContentHandler,
  savePageContentDraftHandler,
} from "../../controllers/platformContent.controller.ts";
import {
  approveTrialRequestHandler,
  listTrialRequestsHandler,
  rejectTrialRequestHandler,
} from "../../controllers/trialRequest.controller.ts";

const router = Router();

router.get("/registry", getEntitlementRegistryHandler);

router.get("/trial-requests", listTrialRequestsHandler);
router.post(
  "/trial-requests/:requestId/approve",
  validate(reviewTrialRequestSchema),
  approveTrialRequestHandler
);
router.post(
  "/trial-requests/:requestId/reject",
  validate(reviewTrialRequestSchema),
  rejectTrialRequestHandler
);

router.get("/plans", listPlansHandler);
router.post("/plans", validate(createPlanBodySchema), createPlanHandler);
router.post("/plans/reorder", validate(reorderPlansBodySchema), reorderPlansHandler);
router.get("/plans/:planId", getPlanHandler);
router.get("/plans/:planId/impact", getPlanImpactHandler);
router.get("/plans/:planId/versions", getPlanVersionsHandler);
router.put("/plans/:planId", validate(updatePlanBodySchema), updatePlanHandler);
router.put("/plans/:planId/draft", validate(updatePlanBodySchema), savePlanDraftHandler);
router.post("/plans/:planId/publish", publishPlanDraftHandler);
router.post("/plans/:planId/toggle", validate(toggleActiveBodySchema), togglePlanActiveHandler);
router.post("/plans/:planId/restore", validate(restoreVersionBodySchema), restorePlanVersionHandler);
router.post("/plans/:planId/duplicate", duplicatePlanHandler);
router.post("/plans/:planId/archive", validate(archivePlanBodySchema), archivePlanHandler);
router.post("/plans/:planId/activate", activatePlanHandler);
router.delete("/plans/:planId", deletePlanHandler);

router.get("/packs", listCreditPacksHandler);
router.post("/packs", validate(createCreditPackBodySchema), createCreditPackHandler);
router.post("/packs/reorder", validate(reorderPacksBodySchema), reorderCreditPacksHandler);
router.put("/packs/:packId", validate(updateCreditPackBodySchema), updateCreditPackHandler);
router.put("/packs/:packId/draft", validate(updateCreditPackBodySchema), saveCreditPackDraftHandler);
router.get("/packs/:packId/versions", getCreditPackVersionsHandler);
router.post("/packs/:packId/publish", publishCreditPackDraftHandler);
router.post("/packs/:packId/toggle", validate(toggleActiveBodySchema), toggleCreditPackActiveHandler);
router.post("/packs/:packId/restore", validate(restoreVersionBodySchema), restoreCreditPackVersionHandler);
router.delete("/packs/:packId", deleteCreditPackHandler);

router.get("/coupons", listCouponsHandler);
router.post("/coupons", validate(couponBodySchema), createCouponHandler);
router.put("/coupons/:couponId/draft", validate(updateCouponBodySchema), saveCouponDraftHandler);
router.get("/coupons/:couponId/versions", getCouponVersionsHandler);
router.post("/coupons/:couponId/publish", publishCouponDraftHandler);
router.post("/coupons/:couponId/toggle", validate(toggleActiveBodySchema), toggleCouponActiveHandler);
router.post("/coupons/:couponId/restore", validate(restoreVersionBodySchema), restoreCouponVersionHandler);
router.delete("/coupons/:couponId", disableCouponHandler);

router.get("/content", listPageContentHandler);
router.put("/content/draft", validate(contentDraftBodySchema), savePageContentDraftHandler);
router.post("/content/publish", validate(publishContentBodySchema), publishPageContentHandler);
router.get("/content/:key/versions", getPageContentVersionsHandler);

export default router;
