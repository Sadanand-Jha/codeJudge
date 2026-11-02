import apiClient from "@/lib/axios";

export type ReferralStatus = "pending" | "qualified" | "rejected";

export interface ReferralEntry {
  id: number;
  status: ReferralStatus;
  credits: number;
  username: string;
  displayName: string;
  planName: string | null;
  signedUpAt: string;
  qualifiedAt: string | null;
}

export interface ReferralDashboard {
  code: string;
  rewardCredits: number;
  stats: {
    friendsSignedUp: number;
    firstPlansBought: number;
    creditsEarned: number;
  };
  recent: ReferralEntry[];
}

/** GET /api/v1/user/referrals */
export async function getReferralDashboard(): Promise<ReferralDashboard> {
  const response = await apiClient.get<ReferralDashboard>("/v1/user/referrals");
  return response.data;
}
