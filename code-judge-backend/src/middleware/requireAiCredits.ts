import type { NextFunction, Request, Response } from "express";
import { assertAiCreditsAvailable } from "../services/aiCredits.service.ts";
import { EntitlementError } from "../services/entitlements/errors.ts";

/**
 * Blocks AI requests before generation starts when the account is below the
 * minimum generation balance. The actual token-based debit happens after the
 * provider reports usage, so this only guarantees a usable balance rather than
 * reserving the full cost of a request.
 */
export const requireAiCredits = async (
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
    await assertAiCreditsAvailable(userId);
    next();
  } catch (error) {
    if (error instanceof EntitlementError) {
      res.status(403).json({
        success: false,
        code: error.code,
        message: error.message,
        remaining: error.remaining,
        requiredPlan: error.requiredPlan,
        upgradeUrl: error.upgradeUrl,
      });
      return;
    }
    console.error("AI credit check failed:", error);
    res.status(503).json({
      success: false,
      message: "AI credit balance could not be verified. Please try again.",
    });
  }
};
