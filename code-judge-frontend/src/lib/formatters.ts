/**
 * Formatting helpers shared across the app.
 */

/** Shared IST (Kolkata) timezone option for all date formatting. */
export const IST_TIMEZONE = "Asia/Kolkata";

export function timeAgo(dateValue: string | number | Date): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "recently";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export function formatDate(dateValue: string | number | Date): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE, month: "short", day: "numeric" });
}

/** Full date+time in IST — "5 Jan 2025, 2:30 PM" */
export function formatDateTimeIST(dateValue: string | number | Date): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Short date in IST — "5 Jan 2025" */
export function formatDateIST(dateValue: string | number | Date): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * True when the given date falls within the last `windowMs` milliseconds.
 * Encapsulates `Date.now()` so components stay render-pure.
 */
export function isWithinWindow(dateValue: string | number | Date, windowMs: number): boolean {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() < windowMs;
}