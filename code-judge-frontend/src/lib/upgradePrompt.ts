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
  /** Tab to show when the modal opens. Defaults to AI credit packs. */
  tab?: UpgradeModalTab;
}

/** Open the global upgrade modal from anywhere in the client. */
export function showUpgradeModal(detail: UpgradeModalDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<UpgradeModalDetail>(UPGRADE_MODAL_EVENT, { detail })
  );
}

interface ApiErrorPayload {
  code?: unknown;
  message?: unknown;
  data?: { code?: unknown; message?: unknown };
}

/**
 * Opens the upgrade modal only for credit exhaustion responses. Other
 * entitlement failures (plan limits, locked features) keep their existing
 * inline messaging.
 */
export function showUpgradeModalForError(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as ApiErrorPayload;
  const code = value.code ?? value.data?.code;
  if (code !== "NO_AI_CREDITS") return false;
  const message =
    (typeof value.message === "string" && value.message) ||
    (typeof value.data?.message === "string" && value.data.message) ||
    undefined;
  showUpgradeModal({ code, message });
  return true;
}
