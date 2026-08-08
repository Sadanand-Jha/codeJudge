import type { Request, Response } from "express";

/**
 * Fallback timezone list used when the runtime does not expose
 * `Intl.supportedValuesOf("timeZone")` (Node < 18.14).
 */
const FALLBACK_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Pacific/Auckland",
];

function listTimezones(): string[] {
  try {
    const zones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
      "timeZone"
    );
    if (Array.isArray(zones) && zones.length > 0) return zones;
  } catch {
    // Fall through to the static fallback list
  }
  return FALLBACK_TIMEZONES;
}

/**
 * GET /api/v1/user/timezones
 * Returns the list of IANA timezone names used by the quiz scheduler.
 */
export const getTimezones = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: listTimezones(),
    });
  } catch (error) {
    console.error("Error fetching timezones:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching timezones",
    });
  }
};
