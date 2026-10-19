export type VerificationState = "verified" | "pending" | "unverified";

export type VerificationInput =
  | VerificationState
  | "complete"
  | "required"
  | boolean
  | null
  | undefined;

export const VERIFICATION_LABEL: Record<VerificationState, string> = {
  verified: "Verified",
  pending: "Pending",
  unverified: "Not verified",
};

/**
 * Single mapping for every verification indicator on the site.
 * Account flags use booleans; creator KYC sections use workflow statuses.
 */
export function verificationState(value: VerificationInput): VerificationState {
  if (value === true || value === "verified" || value === "complete") return "verified";
  if (value === "pending") return "pending";
  return "unverified";
}

export function verificationLabel(value: VerificationInput): string {
  return VERIFICATION_LABEL[verificationState(value)];
}
