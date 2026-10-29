import { normalizeCredits } from "./creditState";

export const REFUEL_POLL_INTERVAL_MS = 2_500;
export const REFUEL_TIMEOUT_MS = 60_000;
export const REFUEL_TIMEOUT_MESSAGE =
  "Payment received. Credits are taking longer than usual to appear — refresh in a minute.";
export const REFUEL_SUCCESS_TITLE = "Tank refuelled.";

export interface RefuelWaitOptions {
  /** Re-reads the authoritative balance from the server. */
  refresh: () => Promise<unknown>;
  /** Current store balance, read after each refresh. */
  readBalance: () => number;
  /** Balance that proves the purchased credits landed (defaults to 1). */
  targetBalance?: number;
  intervalMs?: number;
  timeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RefuelWaitResult {
  status: "refuelled" | "timeout";
  balance: number;
}

/**
 * Keeps the checkout in its processing state until the server reports a
 * positive balance. Payment success alone never flips the theme — only the
 * confirmed balance does.
 */
export async function waitForCreditRefuel({
  refresh,
  readBalance,
  targetBalance = 1,
  intervalMs = REFUEL_POLL_INTERVAL_MS,
  timeoutMs = REFUEL_TIMEOUT_MS,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: RefuelWaitOptions): Promise<RefuelWaitResult> {
  const deadline = now() + timeoutMs;
  const target = Math.max(1, normalizeCredits(targetBalance));

  for (;;) {
    await refresh();
    const balance = normalizeCredits(readBalance());
    if (balance >= target) return { status: "refuelled", balance };
    if (now() >= deadline) return { status: "timeout", balance };
    await sleep(intervalMs);
  }
}
