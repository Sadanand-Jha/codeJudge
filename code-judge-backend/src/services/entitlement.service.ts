// Effective entitlement resolution — the single gate every plan limit and
// feature flag flows through.
//
//   plan entitlements (or free-plan defaults)
//     + non-expired per-subscription overrides  ->  getEntitlements(userId)
//
// Results are cached for 60 seconds in Redis (key namespace carries a global
// version so a plan-wide change invalidates every cached user at once).
// Call `invalidateEntitlements(userId)` after any per-user subscription
// change and `invalidateAllEntitlements()` after plan edits.
import type { Response } from "express";
import redisClient from "../config/redis.ts";
import {
  type EntitlementValue,
  UNLIMITED,
  coerceEntitlementValue,
  getEntitlementDefaults,
  getEntitlementDefinition,
} from "../config/entitlementRegistry.ts";
import {
  type PlanSummaryRow,
  subscriptionRepository,
} from "../repositories/subscription.repository.ts";

export type EntitlementSource = "subscription" | "free_plan" | "registry_defaults";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired";

export interface EffectiveEntitlements {
  userId: number;
  subscriptionId: number | null;
  planId: number | null;
  planSlug: string | null;
  planName: string | null;
  /** "free" when the user has no entitled subscription at all. */
  status: SubscriptionStatus | "free";
  isPaid: boolean;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  values: Record<string, EntitlementValue>;
  /** Only the keys that differ from the plan, for admin/usage displays. */
  overrides: Record<string, EntitlementValue>;
  source: EntitlementSource;
  computedAt: string;
}

export type EntitlementLimitCode = "PLAN_LIMIT_REACHED" | "FEATURE_NOT_INCLUDED";

/**
 * Thrown when a user exceeds a plan limit or uses a feature their plan does
 * not include. Controllers must map this to HTTP 403 (with an upgrade hint),
 * never to a generic error, so the client can show the upgrade prompt.
 */
export class EntitlementLimitError extends Error {
  code: EntitlementLimitCode;
  entitlementKey: string;
  limit?: number;
  currentUsage?: number;
  upgradeUrl = "/pricing";

  constructor(
    code: EntitlementLimitCode,
    entitlementKey: string,
    message: string,
    details?: { limit?: number; currentUsage?: number }
  ) {
    super(message);
    this.name = "EntitlementLimitError";
    this.code = code;
    this.entitlementKey = entitlementKey;
    this.limit = details?.limit;
    this.currentUsage = details?.currentUsage;
  }
}

const CACHE_TTL_SECONDS = 60;
const CACHE_VERSION_KEY = "entitlements:cache_version";
const CACHE_KEY_PREFIX = "entitlements";
const FREE_PLAN_MEMO_TTL_MS = 5 * 60 * 1000;

let freePlanMemo: { plan: PlanSummaryRow | null; at: number } | null = null;

async function getCacheVersion(): Promise<string> {
  const version = await redisClient.get(CACHE_VERSION_KEY);
  return version || "1";
}

function buildCacheKey(userId: number, version: string): string {
  return `${CACHE_KEY_PREFIX}:v${version}:${userId}`;
}

async function getDefaultFreePlanCached(): Promise<PlanSummaryRow | null> {
  if (freePlanMemo && Date.now() - freePlanMemo.at < FREE_PLAN_MEMO_TTL_MS) {
    return freePlanMemo.plan;
  }
  const plan = await subscriptionRepository.getDefaultFreePlan();
  freePlanMemo = { plan, at: Date.now() };
  return plan;
}

function applyRows(base: Record<string, EntitlementValue>, rows: Array<{ key: string; value: unknown }>): Record<string, EntitlementValue> {
  for (const row of rows) {
    const value = coerceEntitlementValue(row.key, row.value);
    if (value !== undefined) base[row.key] = value;
  }
  return base;
}

function buildBaseValues(): Record<string, EntitlementValue> {
  return { ...getEntitlementDefaults() };
}

function emptyEffective(userId: number): EffectiveEntitlements {
  return {
    userId,
    subscriptionId: null,
    planId: null,
    planSlug: null,
    planName: null,
    status: "free",
    isPaid: false,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    values: buildBaseValues(),
    overrides: {},
    source: "registry_defaults",
    computedAt: new Date().toISOString(),
  };
}

async function resolveEntitlements(userId: number): Promise<EffectiveEntitlements> {
  if (!Number.isFinite(userId)) return emptyEffective(userId);

  const subscription = await subscriptionRepository.getActiveSubscriptionWithPlan(userId);

  if (subscription) {
    const values = applyRows(buildBaseValues(), await subscriptionRepository.getPlanEntitlementRows(subscription.plan_id));
    const overrideRows = await subscriptionRepository.getActiveOverrideRows(subscription.id);
    const overrides: Record<string, EntitlementValue> = {};
    for (const row of overrideRows) {
      const value = coerceEntitlementValue(row.key, row.value);
      if (value !== undefined) {
        values[row.key] = value;
        overrides[row.key] = value;
      }
    }
    return {
      userId,
      subscriptionId: subscription.id,
      planId: subscription.plan_id,
      planSlug: subscription.plan_slug,
      planName: subscription.plan_name,
      status: subscription.status,
      isPaid: !subscription.plan_is_default_free,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end).toISOString() : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end).toISOString() : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      values,
      overrides,
      source: "subscription",
      computedAt: new Date().toISOString(),
    };
  }

  const freePlan = await getDefaultFreePlanCached();
  if (freePlan) {
    const values = applyRows(
      buildBaseValues(),
      await subscriptionRepository.getPlanEntitlementRows(freePlan.id)
    );
    return {
      ...emptyEffective(userId),
      planId: freePlan.id,
      planSlug: freePlan.slug,
      planName: freePlan.name,
      values,
      source: "free_plan",
    };
  }

  return emptyEffective(userId);
}

/** Effective entitlements for a user (plan + overrides), cached for 60s. */
export async function getEntitlements(
  userId: number | string,
  options?: { skipCache?: boolean }
): Promise<EffectiveEntitlements> {
  const id = Number(userId);
  const version = await getCacheVersion();
  const key = buildCacheKey(id, version);

  if (!options?.skipCache) {
    const cached = await redisClient.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as EffectiveEntitlements;
      } catch {
        // Corrupt cache entry — fall through and recompute.
      }
    }
  }

  const fresh = await resolveEntitlements(id);
  await redisClient.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(fresh));
  return fresh;
}

/**
 * Boolean check for feature flags and "has any quota left" questions.
 * Unknown keys return false — never throw for a typo in a read-only check.
 */
export async function can(userId: number | string, key: string): Promise<boolean> {
  const definition = getEntitlementDefinition(key);
  if (!definition) return false;
  const entitlements = await getEntitlements(userId);
  const value = entitlements.values[key];

  if (definition.type === "boolean") return Boolean(value);

  const limit = typeof value === "number" ? value : Number(definition.default);
  return limit === UNLIMITED || limit > 0;
}

/**
 * Enforce a number entitlement. Blocks when `currentUsage + requested` would
 * exceed the plan limit, or when a boolean entitlement is not included.
 * Usage -1/UNLIMITED always passes.
 */
export async function assertLimit(
  userId: number | string,
  key: string,
  currentUsage: number,
  requested = 1
): Promise<void> {
  const definition = getEntitlementDefinition(key);
  if (!definition) {
    throw new Error(`Unknown entitlement key: ${key}`);
  }

  const entitlements = await getEntitlements(userId);
  const value = entitlements.values[key];

  if (definition.type === "boolean") {
    if (!value) {
      throw new EntitlementLimitError(
        "FEATURE_NOT_INCLUDED",
        key,
        `Your current plan doesn't include ${definition.label.toLowerCase()}. Upgrade your plan to use this feature.`
      );
    }
    return;
  }

  const limit = typeof value === "number" ? value : Number(definition.default);
  if (limit === UNLIMITED) return;

  if (currentUsage + requested > limit) {
    const unit = definition.unit ? ` ${definition.unit}` : "";
    throw new EntitlementLimitError(
      "PLAN_LIMIT_REACHED",
      key,
      `You've reached your plan limit for ${definition.label.toLowerCase()} (${limit}${unit}). Upgrade your plan to continue.`,
      { limit, currentUsage }
    );
  }
}

/** Drop the cached entitlements for one user (subscription/override change). */
export async function invalidateEntitlements(userId: number | string): Promise<void> {
  const id = Number(userId);
  if (!Number.isFinite(id)) return;
  const version = await getCacheVersion();
  await redisClient.del(buildCacheKey(id, version));
}

/** Drop every cached entitlement (plan entitlements/prices changed). */
export async function invalidateAllEntitlements(): Promise<void> {
  const version = await redisClient.incr(CACHE_VERSION_KEY);
  if (!version) {
    // incr failed (Redis down) — bump locally is impossible across instances;
    // the 60s TTL remains the safety net.
    console.warn("Failed to bump entitlement cache version; cached values expire within 60s.");
  }
  freePlanMemo = null;
}

/**
 * Auto-assign the default free plan to a user with no subscription.
 * Idempotent and race-safe (single INSERT ... WHERE NOT EXISTS statement).
 */
export async function ensureFreeSubscription(userId: number | string): Promise<number | null> {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;

  const freePlan = await getDefaultFreePlanCached();
  if (!freePlan) {
    console.warn("No default free plan configured; skipping free subscription assignment.");
    return null;
  }

  const created = await subscriptionRepository.insertFreeSubscriptionIfMissing(id, freePlan.id, "self_serve");
  if (created) await invalidateEntitlements(id);
  return created;
}

/**
 * Respond with 403 + upgrade metadata when `error` is an EntitlementLimitError.
 * Returns true when it handled the error, so controllers can write:
 *
 *   if (sendEntitlementError(error, res)) return;
 */
export function sendEntitlementError(error: unknown, res: Response): boolean {
  if (!(error instanceof EntitlementLimitError)) return false;
  res.status(403).json({
    success: false,
    message: error.message,
    code: error.code,
    entitlementKey: error.entitlementKey,
    limit: error.limit,
    currentUsage: error.currentUsage,
    upgradeUrl: error.upgradeUrl,
  });
  return true;
}
