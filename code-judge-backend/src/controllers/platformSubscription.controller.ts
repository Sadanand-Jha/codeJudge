// Platform subscription-management controller (owner-only, mounted under
// /api/v1/platform/subscriptions). Phase 2 exposes the plan catalog; later
// phases add subscription, payment and coupon endpoints.
import type { Request, Response } from "express";
import { ENTITLEMENT_REGISTRY } from "../config/entitlementRegistry.ts";
import { getClientIp } from "../utils/getClientIp.ts";
import {
  PlanServiceError,
  type ActorContext,
  planService,
} from "../services/plan.service.ts";

function actorFromRequest(req: Request): ActorContext {
  return {
    actorId: req.user?.userId ? Number(req.user.userId) : null,
    actorRole: "platform_admin",
    ip: getClientIp(req),
  };
}

function planIdFromRequest(req: Request, res: Response): number | null {
  const planId = Number(req.params.planId);
  if (!Number.isInteger(planId) || planId <= 0) {
    res.status(400).json({ success: false, message: "Invalid plan id." });
    return null;
  }
  return planId;
}

function respondError(error: unknown, res: Response, label: string): void {
  if (error instanceof PlanServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.details ?? {}),
    });
    return;
  }
  console.error(`Platform subscriptions: ${label}`, error);
  res.status(500).json({ success: false, message: "Internal server error." });
}

/** Registry metadata (labels/types/defaults) that drives the plan editor UI. */
export const getEntitlementRegistryHandler = (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: { registry: ENTITLEMENT_REGISTRY } });
};

export const listPlansHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const plans = await planService.listPlans({
      search: search || undefined,
      status: status === "draft" || status === "active" || status === "archived" ? status : undefined,
    });
    res.status(200).json({ success: true, data: { plans } });
  } catch (error) {
    respondError(error, res, "list plans");
  }
};

export const getPlanHandler = async (req: Request, res: Response): Promise<void> => {
  const planId = planIdFromRequest(req, res);
  if (planId === null) return;
  try {
    res.status(200).json({ success: true, data: await planService.getPlan(planId) });
  } catch (error) {
    respondError(error, res, "get plan");
  }
};

export const getPlanImpactHandler = async (req: Request, res: Response): Promise<void> => {
  const planId = planIdFromRequest(req, res);
  if (planId === null) return;
  try {
    res.status(200).json({ success: true, data: await planService.getPlanImpact(planId) });
  } catch (error) {
    respondError(error, res, "get plan impact");
  }
};

export const createPlanHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const plan = await planService.createPlan(req.body, actorFromRequest(req));
    res.status(201).json({ success: true, message: "Plan created.", data: plan });
  } catch (error) {
    respondError(error, res, "create plan");
  }
};

export const updatePlanHandler = async (req: Request, res: Response): Promise<void> => {
  const planId = planIdFromRequest(req, res);
  if (planId === null) return;
  try {
    const { expectedUpdatedAt, ...rest } = req.body as Record<string, unknown>;
    const plan = await planService.updatePlan(
      planId,
      {
        ...rest,
        expectedUpdatedAt: typeof expectedUpdatedAt === "string" ? new Date(expectedUpdatedAt) : undefined,
      } as Parameters<typeof planService.updatePlan>[1],
      actorFromRequest(req)
    );
    res.status(200).json({ success: true, message: "Plan updated.", data: plan });
  } catch (error) {
    respondError(error, res, "update plan");
  }
};

export const duplicatePlanHandler = async (req: Request, res: Response): Promise<void> => {
  const planId = planIdFromRequest(req, res);
  if (planId === null) return;
  try {
    const plan = await planService.duplicatePlan(planId, actorFromRequest(req));
    res.status(201).json({ success: true, message: "Plan duplicated.", data: plan });
  } catch (error) {
    respondError(error, res, "duplicate plan");
  }
};

export const archivePlanHandler = async (req: Request, res: Response): Promise<void> => {
  const planId = planIdFromRequest(req, res);
  if (planId === null) return;
  try {
    const plan = await planService.archivePlan(planId, req.body ?? {}, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Plan archived.", data: plan });
  } catch (error) {
    respondError(error, res, "archive plan");
  }
};

export const activatePlanHandler = async (req: Request, res: Response): Promise<void> => {
  const planId = planIdFromRequest(req, res);
  if (planId === null) return;
  try {
    const plan = await planService.activatePlan(planId, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Plan activated.", data: plan });
  } catch (error) {
    respondError(error, res, "activate plan");
  }
};

export const deletePlanHandler = async (req: Request, res: Response): Promise<void> => {
  const planId = planIdFromRequest(req, res);
  if (planId === null) return;
  try {
    await planService.deletePlan(planId, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Plan deleted." });
  } catch (error) {
    respondError(error, res, "delete plan");
  }
};

export const reorderPlansHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await planService.reorderPlans(req.body.planIds, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Plan order saved.", data: { plans } });
  } catch (error) {
    respondError(error, res, "reorder plans");
  }
};
