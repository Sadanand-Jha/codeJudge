import {
  getUserTimeZone,
  toZonedDateTimeParts,
  zonedDateTimeToISO,
} from "@/lib/timezone";

export function toDateString(d: Date): string {
  return toISTDateTimeParts(d.toISOString()).date;
}

export function toTimeString(d: Date): string {
  return toISTDateTimeParts(d.toISOString()).time;
}

export function formatDateTime(date: string, time: string): string {
  if (!date) return "\u2014";
  const d = new Date(`${date}T12:00:00Z`);
  const datePart = d.toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return time ? `${datePart} \u00b7 ${formatTime12(time)}` : datePart;
}

/** Format an ISO/server datetime in the viewer's browser timezone. */
export function formatDateTimeIST(value: string | null | undefined, fallback = "\u2014"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const timeZone = getUserTimeZone();
  const datePart = date.toLocaleDateString("en-IN", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} \u00b7 ${timePart}`;
}

/** Split an ISO/server datetime into the browser-local date (YYYY-MM-DD) and time (HH:mm). */
export function toISTDateTimeParts(value: string | null | undefined): { date: string; time: string } {
  return toZonedDateTimeParts(value, getUserTimeZone());
}

export function formatTime12(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60)
    return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)
    return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
}

export function isPast(date: string, time: string): boolean {
  if (!date) return false;
  const target = new Date(zonedDateTimeToISO(date, time || "23:59"));
  return target.getTime() < Date.now();
}

export function isStartAfterEnd(
  sDate: string,
  sTime: string,
  eDate: string,
  eTime: string
): boolean {
  if (!sDate || !eDate) return false;
  const a = new Date(zonedDateTimeToISO(sDate, sTime || "00:00"));
  const b = new Date(zonedDateTimeToISO(eDate, eTime || "23:59"));
  return a.getTime() >= b.getTime();
}
