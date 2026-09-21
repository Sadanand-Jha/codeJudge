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
    // (SameSite=Lax works). Browser hits same origin /api -> Next.js forwards
    // to real backend, response Set-Cookie is then stored for frontend host.
    // Uses NEXT_PUBLIC_BACKEND_URL if absolute, otherwise defaults to
    // production backend. In dev it falls back to localhost:8000.
    const rawBackend =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://quizbackend-dun.vercel.app/api"
        : "http://localhost:8000/api");
    // If env is already relative (/api) skip rewrite - no backend to proxy to
    if (rawBackend.startsWith("/")) return [];
    const backendOrigin = rawBackend.replace(/\/api\/?$/, "").replace(/\/$/, "");
    if (!backendOrigin || !backendOrigin.startsWith("http")) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
