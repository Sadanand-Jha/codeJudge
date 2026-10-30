import { LOW_CREDIT_THRESHOLD } from "@/config/aiCredits";

export type CreditState = "ok" | "empty" | "unknown";
export type CreditBalanceStatus = "idle" | "loading" | "ready" | "error";

export interface NormalizedCreditSnapshot {
  balance: number;
  planCredits: number;
  purchasedCredits: number;
  planCreditsTotal: number;
  purchasedCreditsTotal: number;
  nearestExpiry: string | null;
}

export interface CreditStateInput {
  balance: number | null | undefined;
  status: CreditBalanceStatus;
  hasSnapshot: boolean;
}

/** Coerce any server/cache value into a safe non-negative credit count. */
export function normalizeCredits(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

/**
 * The theme is only allowed to switch after a confirmed snapshot. While the
 * first request is in flight — or when it fails before any cache exists — the
 * state stays `unknown`, so zero-balance styling never flashes for a user who
 * actually has credits.
 */
export function creditStateFromSnapshot({
  balance,
  status,
  hasSnapshot,
}: CreditStateInput): CreditState {
  if (!hasSnapshot) return "unknown";
  if (balance === null || balance === undefined) return "unknown";
  if (status === "ready" && !Number.isFinite(Number(balance))) return "unknown";
  return normalizeCredits(balance) <= LOW_CREDIT_THRESHOLD ? "empty" : "ok";
}

function parseExpiry(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalizes a balance endpoint payload. The backend already excludes expired
 * orders; if a cached snapshot's nearest expiry has passed, the cache is stale
 * and is discarded so the UI stays `unknown` until the server confirms a new
 * balance. It must never turn into a false zero-credit warning.
 */
export function normalizeCreditSnapshot(
  snapshot: Partial<NormalizedCreditSnapshot> | null | undefined,
  now = Date.now()
): NormalizedCreditSnapshot | null {
  if (!snapshot) return null;

  const expiry = parseExpiry(snapshot.nearestExpiry);
  if (expiry !== null && expiry <= now) return null;

  return {
    balance: normalizeCredits(snapshot.balance),
    planCredits: normalizeCredits(snapshot.planCredits),
    purchasedCredits: normalizeCredits(snapshot.purchasedCredits),
    planCreditsTotal: normalizeCredits(snapshot.planCreditsTotal),
    purchasedCreditsTotal: normalizeCredits(snapshot.purchasedCreditsTotal),
    nearestExpiry: snapshot.nearestExpiry ?? null,
  };
}

/** Five-segment fuel meter. Never shows a filled segment at zero credits. */
export function fuelSegments(
  remaining: number,
  capacity: number,
  segments = 5
): number {
  const safeRemaining = normalizeCredits(remaining);
  if (safeRemaining <= 0) return 0;
  const safeCapacity = Math.max(normalizeCredits(capacity), safeRemaining, 1);
  const ratio = Math.min(1, safeRemaining / safeCapacity);
  return Math.max(1, Math.min(segments, Math.ceil(ratio * segments)));
}

export function creditExpiryDays(
  expiresAt: number | null | undefined,
  now = Date.now()
): number | null {
  if (!expiresAt || !Number.isFinite(expiresAt)) return null;
  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 86_400_000);
}
