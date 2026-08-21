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
};

export default nextConfig;
