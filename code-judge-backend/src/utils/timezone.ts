export const DEFAULT_REPORT_TIME_ZONE = "UTC";

export function resolveTimeZone(value: unknown, fallback = DEFAULT_REPORT_TIME_ZONE): string {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate) return fallback;
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}
