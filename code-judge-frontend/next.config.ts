import type { NextConfig } from "next";

/**
 * Backend origin for the /api proxy (Option B: same-origin /api so auth
 * cookies stay first-party). Server-side only — plain BACKEND_URL, no
 * NEXT_PUBLIC_ prefix needed. Rewrites resolve at request time, so this
 * reads the runtime env on both `next dev` and deployed servers.
 *
 * Local dev:  BACKEND_URL=http://localhost:8000   (see .env, NODE_ENV=development)
 * Production: BACKEND_URL=https://quizbackend-dun.vercel.app (NODE_ENV=production, or Vercel dashboard env)
 */
const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://quizbackend-dun.vercel.app");

if (process.env.NODE_ENV === "development") {
  console.log(`[next.config] /api/* -> ${BACKEND_URL}/api/*`);
}

/**
 * Legacy routes that moved into the Preparation area.
 * Keep in sync with LEGACY_PREPARATION_ROUTES in src/config/preparation.ts
 * (duplicated here because next.config cannot safely import app code).
 */
const legacyPreparationRedirects = [
  { source: "/roadmaps", destination: "/preparation/roadmaps" },
  { source: "/roadmaps/:slug", destination: "/preparation/roadmaps/:slug" },
  { source: "/interview", destination: "/preparation/interviews" },
  { source: "/discussions", destination: "/preparation/discussions" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.107.212.98"],
  async redirects() {
    return legacyPreparationRedirects.map((r) => ({ ...r, permanent: false }));
  },
  async rewrites() {
    // Option B: Proxy /api to backend so auth cookies become first-party
    // (SameSite=lax works). Browser hits same origin /api -> Next.js forwards
    // to BACKEND_URL, response Set-Cookie is then stored for frontend host.
    return [
      {
        source: "/me/:path*",
        destination: `${BACKEND_URL}/me/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
