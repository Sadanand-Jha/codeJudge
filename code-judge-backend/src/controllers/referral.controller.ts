import type { Request, Response } from "express";
import { getReferralDashboard } from "../services/referral.service.ts";

/** GET /api/v1/user/referrals — code, stats and recent invites for the signed-in user. */
export const getMyReferrals = async (req: Request, res: Response) => {
  try {
    const rawUserId = req.user?.userId;
    const userId = Number(rawUserId);
    if (!rawUserId || !Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const data = await getReferralDashboard(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Failed to load referrals:", error);
    res.status(500).json({ success: false, message: "Could not load referrals" });
  }
};
