// Referral program business logic. Every account gets a shareable code that can
// be used by any number of friends, while each referred account can apply a
// code only once. A qualifying monthly plan purchase rewards both sides with
// spendable AI credits that stay valid for six months.
import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import {
  getCreditBalance,
  insertCreditTransaction,
} from "../repositories/billing.repository.ts";
import {
  findUserByReferralCode,
  getRecentReferrals,
  getReferralBonusPack,
  getReferralByOrderId,
  getReferralStats,
  getUserReferralCode,
  getUsernameById,
  hasPriorPaidPlanOrder,
  hasReferralForUser,
  insertQualifiedReferral,
  insertReferralBonusOrder,
  lockPendingReferralForUser,
  markReferralQualified,
  markReferredRewarded,
  markReferrerRewarded,
  referralCodeExists,
  setUserReferralCode,
  type ReferralStatus,
} from "../repositories/referral.repository.ts";
import { addDays, orderNumber } from "./billing/calculations.ts";

export const REFERRAL_REWARD_CREDITS = 50;
export const REFERRAL_REWARD_VALIDITY_DAYS = 180;

export interface ReferralEntryView {
  id: number;
  status: ReferralStatus;
  credits: number;
  username: string;
  displayName: string;
  planName: string | null;
  signedUpAt: string;
  qualifiedAt: string | null;
}

export interface ReferralDashboardView {
  code: string;
  rewardCredits: number;
  stats: {
    friendsSignedUp: number;
    firstPlansBought: number;
    creditsEarned: number;
  };
  recent: ReferralEntryView[];
}

function normalizeCode(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized || null;
}

function codeBase(username: string): string {
  const base = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return base || "QS";
}

function randomCode(base: string): string {
  return `${base}${randomBytes(2).toString("hex").toUpperCase()}`;
}

/** Generates a code that is both readable and extremely unlikely to collide. */
export async function generateUniqueReferralCode(username: string): Promise<string> {
  const base = codeBase(username);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = randomCode(base);
    if (!(await referralCodeExists(candidate))) return candidate;
  }
  const fallback = `QS${randomBytes(6).toString("hex").toUpperCase()}`;
  if (!(await referralCodeExists(fallback))) return fallback;
  throw new Error("Could not allocate a unique referral code");
}

/** Returns the user's code, lazily creating one for legacy/OAuth accounts. */
export async function ensureReferralCode(userId: number): Promise<string> {
  const existing = await getUserReferralCode(userId);
  if (existing) return existing;

  const username = await getUsernameById(userId);
  if (username === null) throw new Error("User not found");

  const code = await generateUniqueReferralCode(username);
  const saved = await setUserReferralCode(userId, code);
  if (saved) return code;

  const raced = await getUserReferralCode(userId);
  if (raced) return raced;
  throw new Error("Could not save the referral code");
}

export type ReferralValidationReason =
  | "missing_code"
  | "invalid_code"
  | "self_referral"
  | "already_used";

export interface ReferralValidationView {
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

export interface ReferralEligibilityView {
  canUse: boolean;
  reason?: ReferralValidationReason;
  rewardCredits: number;
  validityDays: number;
}

/** Describes the fixed bonus so billing can validate and snapshot it. */
export async function getReferralEligibility(
  userId: number
): Promise<ReferralEligibilityView> {
  const alreadyUsed = await hasReferralForUser(userId);
  return {
    canUse: !alreadyUsed,
    ...(alreadyUsed ? { reason: "already_used" as const } : {}),
    rewardCredits: REFERRAL_REWARD_CREDITS,
    validityDays: REFERRAL_REWARD_VALIDITY_DAYS,
  };
}

/**
 * Validates a code a signed-in user typed at monthly plan checkout. The billing
 * service repeats these checks inside order creation so the client can never
 * bypass them.
 */
export async function validateReferralForCheckout(
  userId: number,
  code: string | null | undefined
): Promise<ReferralValidationView> {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return {
      valid: false,
      reason: "missing_code",
      rewardCredits: REFERRAL_REWARD_CREDITS,
      validityDays: REFERRAL_REWARD_VALIDITY_DAYS,
    };
  }

  const referrer = await findUserByReferralCode(normalized);
  if (!referrer) {
    return {
      valid: false,
      reason: "invalid_code",
      rewardCredits: REFERRAL_REWARD_CREDITS,
      validityDays: REFERRAL_REWARD_VALIDITY_DAYS,
    };
  }

  if (referrer.id === userId) {
    return {
      valid: false,
      reason: "self_referral",
      rewardCredits: REFERRAL_REWARD_CREDITS,
      validityDays: REFERRAL_REWARD_VALIDITY_DAYS,
    };
  }

  if (await hasReferralForUser(userId)) {
    return {
      valid: false,
      reason: "already_used",
      rewardCredits: REFERRAL_REWARD_CREDITS,
      validityDays: REFERRAL_REWARD_VALIDITY_DAYS,
    };
  }

  return {
    valid: true,
    code: normalized,
    rewardCredits: REFERRAL_REWARD_CREDITS,
    validityDays: REFERRAL_REWARD_VALIDITY_DAYS,
    referrer: {
      id: referrer.id,
      username: referrer.username,
      displayName: referrer.displayName || referrer.username,
    },
  };
}

export async function getReferralDashboard(
  userId: number
): Promise<ReferralDashboardView> {
  const [code, stats, recent] = await Promise.all([
    ensureReferralCode(userId),
    getReferralStats(userId),
    getRecentReferrals(userId),
  ]);

  return {
    code,
    rewardCredits: REFERRAL_REWARD_CREDITS,
    stats,
    recent: recent.map((row) => ({
      id: row.id,
      status: row.status,
      credits: row.status === "qualified" ? row.rewardCredits : 0,
      username: row.username,
      displayName: row.displayName || row.username,
      planName: row.planName,
      signedUpAt: row.signupAt.toISOString(),
      qualifiedAt: row.qualifiedAt?.toISOString() ?? null,
    })),
  };
}

/**
 * Inserts one zero-value paid pack order and its matching ledger entry so the
 * reward behaves exactly like purchased credits during spending.
 */
async function grantReferralCreditsTx(
  client: PoolClient,
  input: {
    userId: number;
    referralId: number;
    side: "referrer" | "referred";
    credits: number;
    now: Date;
    notes: string;
  }
): Promise<string> {
  const pack = await getReferralBonusPack(client);
  if (!pack) {
    throw new Error("Referral bonus credit pack is not configured");
  }

  const expiresAt = addDays(input.now, pack.validityDays);
  const order = await insertReferralBonusOrder(
    {
      orderNo: orderNumber(input.now),
      userId: input.userId,
      packId: pack.id,
      credits: input.credits,
      validityDays: pack.validityDays,
      startsAt: input.now,
      expiresAt,
      notes: input.notes,
    },
    client
  );

  const balance = await getCreditBalance(String(input.userId), client);
  await insertCreditTransaction(
    {
      userId: String(input.userId),
      orderId: order.id,
      amount: input.credits,
      reason:
        input.side === "referrer"
          ? "referral_referrer_reward"
          : "referral_referred_reward",
      refId: `referral:${input.referralId}:${input.side}`,
      balanceAfter: balance.total,
    },
    client
  );

  if (input.side === "referrer") {
    await markReferrerRewarded({ id: input.referralId, orderId: order.id }, client);
  } else {
    await markReferredRewarded({ id: input.referralId, orderId: order.id }, client);
  }

  return order.id;
}

export interface QualifyReferralInput {
  userId: number;
  orderId: string;
  orderType: string;
  paymentMethod?: string | null;
  referralCode?: string | null;
  referralReferrerUserId?: number | null;
}

export interface ReferralQualificationResult {
  applied: boolean;
  credits: number;
}

/**
 * Called inside the payment transaction after a plan/bundle order is paid.
 *
 * Checkout-time codes are attributed on the qualifying purchase itself. Legacy
 * pending sign-up referrals keep the original "first paid plan" behaviour so
 * accounts created before the checkout flow still receive their bonus.
 */
export async function qualifyReferralForPurchaseTx(
  client: PoolClient,
  input: QualifyReferralInput
): Promise<ReferralQualificationResult> {
  if (input.orderType !== "plan" && input.orderType !== "bundle") {
    return { applied: false, credits: 0 };
  }
  if (input.paymentMethod === "trial") {
    return { applied: false, credits: 0 };
  }

  // Referral rewards are secondary to the paid entitlement: isolate them in a
  // savepoint so a failure can never roll back the successful payment.
  await client.query("SAVEPOINT referral_qualification");
  try {
    const clock = await client.query("SELECT CURRENT_TIMESTAMP AS now");
    const nowValue = clock.rows[0]?.now;
    const now = nowValue instanceof Date ? nowValue : new Date(String(nowValue));

    if (input.referralCode) {
      const referrer = await findUserByReferralCode(input.referralCode);
      if (!referrer || referrer.id === input.userId) {
        return { applied: false, credits: 0 };
      }

      const referral = await insertQualifiedReferral(
        {
          referrerUserId: referrer.id,
          referredUserId: input.userId,
          code: normalizeCode(input.referralCode) as string,
          orderId: input.orderId,
          rewardCredits: REFERRAL_REWARD_CREDITS,
        },
        client
      );
      if (!referral) return { applied: false, credits: 0 };

      await grantReferralCreditsTx(client, {
        userId: referral.referrerUserId,
        referralId: referral.id,
        side: "referrer",
        credits: referral.rewardCredits,
        now,
        notes: `Referral reward: referral #${referral.id}`,
      });

      await grantReferralCreditsTx(client, {
        userId: referral.referredUserId,
        referralId: referral.id,
        side: "referred",
        credits: referral.rewardCredits,
        now,
        notes: `Referral welcome bonus: referral #${referral.id}`,
      });

      return { applied: true, credits: referral.rewardCredits };
    }

    // Legacy sign-up referrals: reward the first real plan purchase only.
    const hadPriorPlan = await hasPriorPaidPlanOrder(
      { userId: input.userId, excludeOrderId: input.orderId },
      client
    );
    if (hadPriorPlan) return { applied: false, credits: 0 };

    const referral = await lockPendingReferralForUser(input.userId, client);
    if (!referral) return { applied: false, credits: 0 };

    const qualified = await markReferralQualified(
      { id: referral.id, orderId: input.orderId },
      client
    );
    if (!qualified) return { applied: false, credits: 0 };

    await grantReferralCreditsTx(client, {
      userId: referral.referrerUserId,
      referralId: referral.id,
      side: "referrer",
      credits: referral.rewardCredits,
      now,
      notes: `Referral reward: referral #${referral.id}`,
    });

    await grantReferralCreditsTx(client, {
      userId: referral.referredUserId,
      referralId: referral.id,
      side: "referred",
      credits: referral.rewardCredits,
      now,
      notes: `Referral welcome bonus: referral #${referral.id}`,
    });

    return { applied: true, credits: referral.rewardCredits };
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT referral_qualification");
    console.error("Failed to grant referral rewards:", error);
    return { applied: false, credits: 0 };
  } finally {
    await client.query("RELEASE SAVEPOINT referral_qualification");
  }
}

/** Reads the reward already attached to a paid order for idempotent responses. */
export async function getOrderReferralReward(
  orderId: string
): Promise<ReferralQualificationResult> {
  const referral = await getReferralByOrderId(orderId);
  return referral
    ? { applied: true, credits: referral.rewardCredits }
    : { applied: false, credits: 0 };
}
