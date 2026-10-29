export const UPGRADE_MODAL_EVENT = "quizsupport:upgrade-modal";

export type UpgradeModalTab = "credits" | "plans";

export interface UpgradeModalDetail {
  code?: string;
  message?: string;
  /** Optional heading copy for non-AI upgrade prompts. */
  title?: string;
  /** Optional supporting copy under the heading. */
  description?: string;
  /** Substring of the title that gets the animated studio colour treatment. */
  titleAccent?: string;
  /** Optional eyebrow label above the heading. */
  eyebrow?: string;
  /** Tab to show when the modal opens. Defaults to the recommended tab. */
  tab?: UpgradeModalTab;
  /** Credits the blocked action needed, when the backend reports it. */
  requiredCredits?: number;
  /** Credits available at the time the action was blocked. */
  remainingCredits?: number;
}

/** Open the global upgrade modal from anywhere in the client. */
export function showUpgradeModal(detail: UpgradeModalDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<UpgradeModalDetail>(UPGRADE_MODAL_EVENT, { detail })
  );
}

interface ApiErrorDetails {
  code?: unknown;
  message?: unknown;
  limit?: unknown;
  used?: unknown;
  remaining?: unknown;
}

interface ApiErrorPayload extends ApiErrorDetails {
  error?: ApiErrorDetails;
  data?: ApiErrorDetails;
}

function readCount(value: unknown): number | undefined {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return undefined;
  return Math.trunc(count);
}

/**
 * Opens the upgrade modal only for credit exhaustion responses. Other
 * entitlement failures (plan limits, locked features) keep their existing
 * inline messaging.
 */
export function showUpgradeModalForError(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as ApiErrorPayload;
  const details = [value, value.error, value.data].filter(
    (entry): entry is ApiErrorDetails => Boolean(entry)
  );
  const code = details
    .map((entry) => entry.code)
    .find(
      (entry): entry is string =>
        typeof entry === "string" && entry.length > 0
    );
  if (code !== "NO_AI_CREDITS") return false;
  const message = details
    .map((entry) => entry.message)
    .find((entry): entry is string => typeof entry === "string" && entry.length > 0);
  const requiredCredits = details
    .map((entry) => readCount(entry.limit))
    .find((entry): entry is number => entry !== undefined);
  const remainingCredits = details
    .map((entry) => readCount(entry.used ?? entry.remaining))
    .find((entry): entry is number => entry !== undefined);
  showUpgradeModal({
    code,
    message,
    tab: "credits",
    requiredCredits,
    remainingCredits,
  });
  return true;
}
