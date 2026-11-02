// Referral program business logic. Codes are generated on demand, signups are
// attributed once, and a first paid plan purchase qualifies both sides for
// spendable AI credits. Grant orders keep the existing credit ledger and
// spending guards unchanged.
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
  getReferralStats,
  getUserReferralCode,
  getUsernameById,
  hasPriorPaidPlanOrder,
  insertReferral,
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

export async function findReferrerByCode(
  code: string | null | undefined
): Promise<{ id: number; username: string } | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return findUserByReferralCode(normalized);
}

export async function recordSignupReferral(input: {
  referrerUserId: number;
  referredUserId: number;
  code: string;
}): Promise<void> {
  const normalized = normalizeCode(input.code);
  if (!normalized) return;
  await insertReferral({
    referrerUserId: input.referrerUserId,
    referredUserId: input.referredUserId,
    code: normalized,
  });
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
}

/**
 * Called inside the payment transaction after a plan/bundle order is paid.
 * Rewards only the user's first real plan purchase, never trials or renewals.
 */
export async function qualifyReferralForFirstPlanTx(
  client: PoolClient,
  input: QualifyReferralInput
): Promise<void> {
  if (input.orderType !== "plan" && input.orderType !== "bundle") return;
  if (input.paymentMethod === "trial") return;

  // Referral rewards are secondary to the paid entitlement: isolate them in a
  // savepoint so a failure can never roll back the successful payment.
  await client.query("SAVEPOINT referral_qualification");
  try {
    const hadPriorPlan = await hasPriorPaidPlanOrder(
      { userId: input.userId, excludeOrderId: input.orderId },
      client
    );
    if (hadPriorPlan) return;

    const referral = await lockPendingReferralForUser(input.userId, client);
    if (!referral) return;

    const qualified = await markReferralQualified(
      { id: referral.id, orderId: input.orderId },
      client
    );
    if (!qualified) return;

    const clock = await client.query("SELECT CURRENT_TIMESTAMP AS now");
    const nowValue = clock.rows[0]?.now;
    const now = nowValue instanceof Date ? nowValue : new Date(String(nowValue));

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
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT referral_qualification");
    console.error("Failed to grant referral rewards:", error);
  } finally {
    await client.query("RELEASE SAVEPOINT referral_qualification");
  }
}
