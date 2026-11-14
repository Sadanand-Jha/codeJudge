import type { Request, Response } from "express";
import {
  getReferralDashboard,
  getReferralEligibility,
  validateReferralForCheckout,
} from "../services/referral.service.ts";

function userIdFrom(req: Request, res: Response): number | null {
  const rawUserId = req.user?.userId;
  const userId = Number(rawUserId);
  if (!rawUserId || !Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return null;
  }
  return userId;
}

/** GET /api/v1/user/referrals — code, stats and recent invites for the signed-in user. */
export const getMyReferrals = async (req: Request, res: Response) => {
  try {
    const userId = userIdFrom(req, res);
    if (userId === null) return;

    const data = await getReferralDashboard(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Failed to load referrals:", error);
    res.status(500).json({ success: false, message: "Could not load referrals" });
  }
};

/** GET /api/v1/user/referrals/eligibility — whether this account can still use a code. */
export const getReferralCheckoutEligibility = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = userIdFrom(req, res);
    if (userId === null) return;

    const data = await getReferralEligibility(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Failed to check referral eligibility:", error);
    res.status(500).json({
      success: false,
      message: "Could not check referral eligibility",
    });
  }
};

/** POST /api/v1/user/referrals/validate — checks a typed code before checkout. */
export const validateReferralCode = async (req: Request, res: Response) => {
  try {
    const userId = userIdFrom(req, res);
    if (userId === null) return;

    const code =
      typeof req.body?.code === "string" ? req.body.code.trim() : null;
    const data = await validateReferralForCheckout(userId, code);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Failed to validate referral code:", error);
    res.status(500).json({
      success: false,
      message: "Could not validate the referral code",
    });
  }
};
