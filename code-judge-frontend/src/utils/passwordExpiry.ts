import { formatDateTimeIST } from "@/lib/formatters";

/** Shared default for new rooms: passwords are valid for one day. */
export const DEFAULT_PASSWORD_EXPIRY_MINUTES = 24 * 60;

export interface PasswordExpiryOption {
  label: string;
  /** Minutes until expiry, or null for "never". */
  minutes: number | null;
}

export const PASSWORD_EXPIRY_OPTIONS: PasswordExpiryOption[] = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 6 * 60 },
  { label: "24 hours", minutes: 24 * 60 },
  { label: "3 days", minutes: 3 * 24 * 60 },
  { label: "7 days", minutes: 7 * 24 * 60 },
  { label: "30 days", minutes: 30 * 24 * 60 },
  { label: "Never (not recommended)", minutes: null },
];

/**
 * Absolute expiry in the Kolkata region. Example:
 * "24 Oct 2026, 6:30 pm IST". The room code itself never expires.
 */
export function formatPasswordExpiry(value: string | null | undefined): string {
  if (!value) return "Does not expire";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Does not expire";
  return `${formatDateTimeIST(date)} IST`;
}

export function isPasswordExpired(
  value: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= now;
}

/** Compact countdown — "Expires in 23h 45m", "Expires in 6d 3h", "Expired". */
export function formatPasswordExpiryRelative(
  value: string | null | undefined,
  now: number = Date.now()
): string {
  if (!value) return "Never expires";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never expires";

  const diff = date.getTime() - now;
  if (diff <= 0) return "Expired";

  const totalMinutes = Math.floor(diff / 60_000);
  if (totalMinutes < 1) return "Expires in under a minute";
  if (totalMinutes < 60) return `Expires in ${totalMinutes}m`;

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return `Expires in ${totalHours}h${minutes ? ` ${minutes}m` : ""}`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `Expires in ${days}d${hours ? ` ${hours}h` : ""}`;
}

export function expiryOptionLabel(minutes: number | null): string {
  return PASSWORD_EXPIRY_OPTIONS.find((option) => option.minutes === minutes)?.label ?? "Custom";
}
