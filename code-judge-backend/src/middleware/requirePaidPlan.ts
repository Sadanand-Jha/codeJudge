import type { NextFunction, Request, Response } from "express";
import { getEntitlements } from "../services/entitlement.service.ts";

/**
 * Blocks features that are reserved for paid monthly plans. The active trial
 * on the default free plan is intentionally not enough here.
 */
export const requirePaidPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const entitlements = await getEntitlements(userId);
    if (!entitlements.isPaid) {
      res.status(403).json({
        success: false,
        code: "FEATURE_LOCKED",
        message:
          "This feature is available on paid plans. Upgrade your plan to continue.",
        requiredPlan: null,
        upgradeUrl: "/pricing",
      });
      return;
    }
    next();
  } catch (error) {
    console.error("Paid plan check failed:", error);
    res.status(503).json({
      success: false,
      message: "Plan access could not be verified. Please try again.",
    });
  }
};
