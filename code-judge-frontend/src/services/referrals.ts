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

export type ReferralValidationReason =
  | "missing_code"
  | "invalid_code"
  | "self_referral"
  | "already_used";

export interface ReferralValidation {
  valid: boolean;
  reason?: ReferralValidationReason;
  code?: string;
  rewardCredits: number;
  validityDays: number;
  referrer?: {
    id: number;
    username: string;
    displayName: string;
  };
}

export interface ReferralEligibility {
  canUse: boolean;
  reason?: ReferralValidationReason;
  rewardCredits: number;
  validityDays: number;
}

/** GET /api/v1/user/referrals/eligibility */
export async function getReferralEligibility(): Promise<ReferralEligibility> {
  const response = await apiClient.get<ReferralEligibility>(
    "/v1/user/referrals/eligibility"
  );
  return response.data;
}

/** POST /api/v1/user/referrals/validate */
export async function validateReferralCode(
  code: string
): Promise<ReferralValidation> {
  const response = await apiClient.post<ReferralValidation>(
    "/v1/user/referrals/validate",
    { code }
  );
  return response.data;
}
