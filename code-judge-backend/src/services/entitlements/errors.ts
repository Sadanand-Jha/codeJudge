import type { Response } from "express";
import type {
  EntitlementErrorCode,
  EntitlementErrorDetails,
} from "./types.ts";

export class EntitlementError extends Error {
  code: EntitlementErrorCode;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  requiredPlan: string | null;
  upgradeUrl: string | null;

  constructor(
    code: EntitlementErrorCode,
    message: string,
    details: EntitlementErrorDetails = {}
  ) {
    super(message);
    this.name = "EntitlementError";
    this.code = code;
    this.limit = details.limit ?? null;
    this.used = details.used ?? null;
    this.remaining = details.remaining ?? null;
    this.requiredPlan = details.requiredPlan ?? null;
    this.upgradeUrl =
      details.upgradeUrl === undefined ? "/pricing" : details.upgradeUrl;
  }
}

export function sendEntitlementError(error: unknown, res: Response): boolean {
  if (!(error instanceof EntitlementError)) return false;

  res.status(403).json({
    error: {
      code: error.code,
      message: error.message,
      limit: error.limit,
      used: error.used,
      remaining: error.remaining,
      requiredPlan: error.requiredPlan,
      upgradeUrl: error.upgradeUrl,
    },
  });
  return true;
}
