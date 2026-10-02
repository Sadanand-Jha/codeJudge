import type { NextFunction, Request, Response } from "express";
import { toKolkataISOString } from "../utils/timeUtils.ts";

const KOLKATA_TIMESTAMP_FIELDS = new Set([
  "created_at",
  "updated_at",
  "createdAt",
  "updatedAt",
  "createdat",
  "updatedat",
  "CreatedAt",
  "UpdatedAt",
]);

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Return an API-safe copy with creation/update timestamps serialized using
 * Asia/Kolkata's explicit +05:30 offset. Other fields are left untouched so
 * this middleware cannot accidentally reinterpret IDs or arbitrary strings.
 */
export function serializeKolkataTimestamps(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(serializeKolkataTimestamps);
  }

  if (!value || typeof value !== "object" || !isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (
        KOLKATA_TIMESTAMP_FIELDS.has(key) &&
        (entry instanceof Date || typeof entry === "string" || typeof entry === "number")
      ) {
        return [key, toKolkataISOString(entry) ?? entry];
      }

      return [key, serializeKolkataTimestamps(entry)];
    })
  );
}

/** Apply Kolkata timestamp serialization consistently to every JSON route. */
export function kolkataTimestampMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => originalJson(serializeKolkataTimestamps(body))) as Response["json"];
  next();
}
