// Owner-only coupon authoring, mounted under /api/v1/platform/subscriptions/coupons.
import type { Request, Response } from "express";
import { getClientIp } from "../utils/getClientIp.ts";
import type { ActorContext } from "../services/plan.service.ts";
import { CouponServiceError, couponService } from "../services/coupon.service.ts";

function actorFromRequest(req: Request): ActorContext {
  return {
    actorId: req.user?.userId ? Number(req.user.userId) : null,
    actorRole: "platform_admin",
    ip: getClientIp(req),
  };
}

function couponIdFromRequest(req: Request, res: Response): number | null {
  const id = Number(req.params.couponId);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: "Invalid coupon id." });
    return null;
  }
  return id;
}

function respondError(error: unknown, res: Response, label: string): void {
  if (error instanceof CouponServiceError) {
    res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    return;
  }
  console.error(`Platform coupons: ${label}`, error);
  res.status(500).json({ success: false, message: "Internal server error." });
}

export const listCouponsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await couponService.listCoupons();
    res.status(200).json({ success: true, data: { coupons } });
  } catch (error) {
    respondError(error, res, "list coupons");
  }
};

export const createCouponHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await couponService.createCoupon(req.body, actorFromRequest(req));
    res.status(201).json({ success: true, message: "Coupon created as draft.", data: coupon });
  } catch (error) {
    respondError(error, res, "create coupon");
  }
};

export const saveCouponDraftHandler = async (req: Request, res: Response): Promise<void> => {
  const id = couponIdFromRequest(req, res);
  if (id === null) return;
  try {
    const coupon = await couponService.saveDraft(id, req.body, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Coupon draft saved.", data: coupon });
  } catch (error) {
    respondError(error, res, "save coupon draft");
  }
};

export const publishCouponDraftHandler = async (req: Request, res: Response): Promise<void> => {
  const id = couponIdFromRequest(req, res);
  if (id === null) return;
  try {
    const coupon = await couponService.publishDraft(id, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Coupon published.", data: coupon });
  } catch (error) {
    respondError(error, res, "publish coupon draft");
  }
};

export const toggleCouponActiveHandler = async (req: Request, res: Response): Promise<void> => {
  const id = couponIdFromRequest(req, res);
  if (id === null) return;
  try {
    const coupon = await couponService.setActive(id, req.body.active === true, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Coupon status updated.", data: coupon });
  } catch (error) {
    respondError(error, res, "toggle coupon");
  }
};

export const disableCouponHandler = async (req: Request, res: Response): Promise<void> => {
  const id = couponIdFromRequest(req, res);
  if (id === null) return;
  try {
    await couponService.disableCoupon(id, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Coupon disabled." });
  } catch (error) {
    respondError(error, res, "disable coupon");
  }
};

export const getCouponVersionsHandler = async (req: Request, res: Response): Promise<void> => {
  const id = couponIdFromRequest(req, res);
  if (id === null) return;
  try {
    const versions = await couponService.listVersions(id);
    res.status(200).json({ success: true, data: { versions } });
  } catch (error) {
    respondError(error, res, "list coupon versions");
  }
};

export const restoreCouponVersionHandler = async (req: Request, res: Response): Promise<void> => {
  const id = couponIdFromRequest(req, res);
  if (id === null) return;
  const versionId = Number(req.body.versionId);
  if (!Number.isInteger(versionId) || versionId <= 0) {
    res.status(400).json({ success: false, message: "Invalid version id." });
    return;
  }
  try {
    const coupon = await couponService.restoreVersion(id, versionId, actorFromRequest(req));
    res.status(200).json({ success: true, message: "Version restored into draft.", data: coupon });
  } catch (error) {
    respondError(error, res, "restore coupon version");
  }
};
