import type { Request, Response } from "express";
import { subscriptionRepository } from "../repositories/subscription.repository.ts";
import { getEntitlements } from "../services/entitlement.service.ts";

/** GET /api/v1/user/subscription — the signed-in user's effective plan. */
export const getMySubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const entitlements = await getEntitlements(userId);
    const latestTrialEnd = entitlements.trialEnd
      ? null
      : await subscriptionRepository.getLatestTrialEnd(Number(userId));
    res.status(200).json({
      success: true,
      data: {
        planId: entitlements.planId,
        planSlug: entitlements.planSlug,
        planName: entitlements.planName,
        status: entitlements.status,
        isPaid: entitlements.isPaid,
        startedAt: entitlements.startedAt,
        currentPeriodStart: entitlements.currentPeriodStart,
        currentPeriodEnd: entitlements.currentPeriodEnd,
        trialEnd: entitlements.trialEnd ?? latestTrialEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    console.error("Failed to load subscription:", error);
    res.status(500).json({ success: false, message: "Could not load subscription" });
  }
};
