import type { MetadataRoute } from "next";

const BASE = "https://www.quizsupport.com";

/**
 * Public, indexable pages only. Everything else is intentionally excluded:
 * - /quiz and /quiz/join require an account and carry a noindex directive
 *   (see src/app/(app)/quiz/layout.tsx)
 * - /quiz/attempts holds private per-user history
 * - /login, /register, /forgot-password are noindex (see src/app/(auth)/layout.tsx)
 * - /creator, /platform and dashboard modules are authenticated workspaces
 * - /pricing is blocked in focus mode and redirects to / (see src/config/focusMode.ts)
 *
 * No `lastModified` is emitted: the app has no trustworthy per-page
 * modification timestamps, and fabricated dates are worse than none.
 */
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/docs",
  "/meet-the-developer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? `${BASE}/` : `${BASE}${path}`,
  }));
}
