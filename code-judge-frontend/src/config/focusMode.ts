/**
 * Focus Mode — Quiz only
 * When enabled, all other sections of the platform are hidden from navigation
 * and blocked at the proxy layer. Single source of truth for both UI and
 * edge enforcement.
 *
 * Set ENABLED = false to restore full platform access.
 */

export const FOCUS_MODE_ENABLED = true;

/**
 * Allowed URL prefixes when focus mode is active.
 * Exact "/" is allowed (repurposed to quiz hub). Everything else must
 * match one of the prefixes below to remain accessible.
 */
export const FOCUS_ALLOWED_PREFIXES: string[] = [
  // Student quiz workspace
  "/quiz",
  // Separate non-student workspaces
  "/creator",
  "/platform",
  // Auth — required for login flows
  "/login",
  "/register",
  "/forgot-password",
];

/**
 * Extra exact paths that should remain accessible (e.g. home).
 * "/" is handled separately with exact match so it doesn't act as wildcard.
 */
export const FOCUS_ALLOWED_EXACT: string[] = [
  "/",
  "/api",
];

/**
 * Check if a pathname is allowed in focus mode.
 * Used by both client (AppLayout) and server (proxy).
 */
export function isPathAllowed(pathname: string): boolean {
  if (!FOCUS_MODE_ENABLED) return true;

  // Normalize: ensure leading slash, no trailing slash (except root)
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // Exact matches
  if (FOCUS_ALLOWED_EXACT.includes(normalized)) return true;

  // Prefix matches — must be exact prefix or prefix + "/"
  for (const prefix of FOCUS_ALLOWED_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(prefix + "/")) return true;
  }

  // System routes (Next internals, static assets, API proxy) — never block
  if (
    normalized.startsWith("/_next") ||
    normalized.startsWith("/api/") ||
    normalized.startsWith("/api") ||
    normalized === "/favicon.ico" ||
    normalized.match(/\.(?:png|jpg|jpeg|svg|webp|gif|ico|css|js|woff2?)$/)
  ) {
    return true;
  }

  return false;
}
