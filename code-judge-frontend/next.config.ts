import type { NextConfig } from "next";

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
    // to real backend, response Set-Cookie is then stored for frontend host.
    // Spec requirement: proxy /api/:path* -> https://quizbackend-dun.vercel.app/api/:path*
    return [
      {
        source: "/api/:path*",
        destination: "https://quizbackend-dun.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
