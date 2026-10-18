/**
 * Frontend validation for the room student import sheet.
 *
 * Whitelist-first: usernames may only contain [A-Za-z0-9._-]. Free-text values
 * are stripped of control / zero-width characters and scanned for HTML, script,
 * template and spreadsheet-formula payloads so nothing hostile can ever be
 * stored, rendered, or re-exported.
 */

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{2,30}$/;

export const MAX_IMPORT_COLUMNS = 15;
export const MAX_IMPORT_ROWS = 200;
export const MAX_HEADER_LENGTH = 60;
export const MAX_CELL_LENGTH = 200;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const WHITESPACE = /\s+/g;

/** Strip control / zero-width characters, collapse whitespace, trim. */
export function stripUnsafeCharacters(raw: string): string {
  return raw
    .replace(CONTROL_CHARS, "")
    .replace(ZERO_WIDTH, "")
    .replace(WHITESPACE, " ")
    .trim();
}

export interface UsernameCheck {
  ok: boolean;
  /** Trimmed + lowercased username (safe to send/store). */
  value: string;
  error?: string;
}

/** Single source of truth for username rules — used by search, add and import. */
export function validateUsername(raw: unknown): UsernameCheck {
  const value = stripUnsafeCharacters(String(raw ?? "")).toLowerCase();
  if (!value) return { ok: false, value, error: "Username is required." };
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      value,
      error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`,
    };
  }
  if (!USERNAME_PATTERN.test(value)) {
    return {
      ok: false,
      value,
      error: "Only letters, numbers, dots, underscores and hyphens are allowed.",
    };
  }
  return { ok: true, value };
}

export function isValidUsername(raw: unknown): boolean {
  return validateUsername(raw).ok;
}

/** Sanitize a free-text import cell before it is stored or displayed. */
export function sanitizeImportValue(raw: unknown): string {
  return stripUnsafeCharacters(String(raw ?? ""));
}

/** Sanitize a column header before it is stored or displayed. */
export function sanitizeColumnName(raw: unknown): string {
  return stripUnsafeCharacters(String(raw ?? ""));
}

/**
 * Human-readable reason when a value carries an injection payload, else null.
 * `-` is only flagged when the value is not a plain number (so "-4.5" passes).
 */
export function findUnsafeValueReason(value: string): string | null {
  if (!value) return null;
  if (/<\s*\/?\s*[a-z!][^>]*>/i.test(value) || /<\s*script/i.test(value)) {
    return "HTML/tag content";
  }
  if (/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i.test(value)) {
    return "an unsafe link";
  }
  if (/\bon[a-z]+\s*=/i.test(value)) return "an inline event handler";
  if (/\{\{|\$\{|<%/.test(value)) return "template syntax";
  if (/^[=+@]/.test(value)) return "a spreadsheet formula";
  if (/^-(?!\d+(?:\.\d+)?$)/.test(value)) return "a spreadsheet formula";
  return null;
}

export function containsUnsafeValue(value: string): boolean {
  return findUnsafeValueReason(value) !== null;
}

/** True when a header marks the username column (case/space/underscore-insensitive). */
export function isUsernameHeader(header: string): boolean {
  const n = header.toLowerCase().replace(/[\s_@]+/g, "");
  return n === "username" || n === "user" || n === "handle";
}

/** Normalized key used for duplicate column detection. */
export function normalizeColumnKey(header: string): string {
  return header.toLowerCase().replace(/\s+/g, " ").trim();
}
