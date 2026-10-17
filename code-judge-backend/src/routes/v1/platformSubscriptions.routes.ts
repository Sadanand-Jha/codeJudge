// /api/v1/platform/subscriptions — owner-only plan catalog management.
// Mounted inside platform.routes.ts (after requireOwner), so every route is
// server-side admin-gated.
import { Router } from "express";
import { validate } from "../../middleware/validate.ts";
import {
  archivePlanBodySchema,
  createPlanBodySchema,
  reorderPlansBodySchema,
  updatePlanBodySchema,
} from "../../middleware/subscription.validate.ts";
import {
  activatePlanHandler,
  archivePlanHandler,
  createPlanHandler,
  deletePlanHandler,
  duplicatePlanHandler,
  getEntitlementRegistryHandler,
  getPlanHandler,
  getPlanImpactHandler,
  listPlansHandler,
  reorderPlansHandler,
  updatePlanHandler,
} from "../../controllers/platformSubscription.controller.ts";

const router = Router();

router.get("/registry", getEntitlementRegistryHandler);

router.get("/plans", listPlansHandler);
router.post("/plans", validate(createPlanBodySchema), createPlanHandler);
router.post("/plans/reorder", validate(reorderPlansBodySchema), reorderPlansHandler);
router.get("/plans/:planId", getPlanHandler);
router.get("/plans/:planId/impact", getPlanImpactHandler);
router.put("/plans/:planId", validate(updatePlanBodySchema), updatePlanHandler);
router.post("/plans/:planId/duplicate", duplicatePlanHandler);
router.post("/plans/:planId/archive", validate(archivePlanBodySchema), archivePlanHandler);
router.post("/plans/:planId/activate", activatePlanHandler);
router.delete("/plans/:planId", deletePlanHandler);

export default router;
