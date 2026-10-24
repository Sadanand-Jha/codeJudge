export const DEFAULT_TIMEZONE = "UTC";

export function browserTimeZone(fallback = DEFAULT_TIMEZONE): string {
  if (typeof window === "undefined") return fallback;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

/**
 * The viewer's browser timezone. The app never reads or stores a per-user
 * timezone; server rendering falls back to UTC until hydration completes.
 */
export function getUserTimeZone(fallback = DEFAULT_TIMEZONE): string {
  return browserTimeZone(fallback);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convert a user-local `YYYY-MM-DD` + `HH:mm` pair into an absolute ISO
 * instant. This is what the API expects so the server never has to guess
 * which timezone a naked datetime string belongs to.
 */
export function zonedDateTimeToISO(
  date: string,
  time: string,
  timeZone = getUserTimeZone()
): string {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "00:00").split(":").map(Number);
  if (!year || !month || !day) return "";

  const target = Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  try {
    let offset = timeZoneOffsetMs(new Date(target), timeZone);
    let instant = target - offset;
    offset = timeZoneOffsetMs(new Date(instant), timeZone);
    instant = target - offset;
    return new Date(instant).toISOString();
  } catch {
    return new Date(`${date}T${time || "00:00"}`).toISOString();
  }
}

/** Split an absolute instant into the user's local date and time fields. */
export function toZonedDateTimeParts(
  value: string | null | undefined,
  timeZone = getUserTimeZone()
): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
    };
  } catch {
    return { date: "", time: "" };
  }
}
