/**
 * Server-safe demo-state parsing shared by creator route pages.
 *
 * Lives outside any `"use client"` module so server components can call it
 * when reading `?state=empty` / `?state=error` search params.
 */

export type DemoPageState = "empty" | "error";

/** Parse an optional `?state=` demo switch for empty/error previews. */
export function demoStateFromParams(value: string | string[] | undefined): DemoPageState | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "empty" || v === "error" ? v : undefined;
}