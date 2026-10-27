import type { NextFunction, Request, Response } from "express";
import { getEntitlements } from "../services/entitlement.service.ts";

export const requirePaidPlan = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required", statusCode: 401 });
    return;
  }

  try {
    const entitlements = await getEntitlements(userId);
    if (!entitlements.isPaid) {
      res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_REQUIRED",
        message: "File uploads are available on paid plans. Upgrade your plan to upload files.",
        upgradeUrl: "/pricing",
      });
      return;
    }
    next();
  } catch (error) {
    console.error("Paid plan check failed:", error);
    res.status(503).json({
      success: false,
      message: "File upload access could not be verified. Please try again.",
      statusCode: 503,
    });
  }
};

export default requirePaidPlan;
