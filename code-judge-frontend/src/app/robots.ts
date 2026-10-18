import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // API and session endpoints
          "/api/",
          "/me/",
          // Authenticated workspaces — kept out of crawling. A noindex
          // directive (meta robots + X-Robots-Tag in proxy.ts) is set as well.
          "/creator",
          "/platform",
          "/dashboard",
          "/analytics",
          "/bookmarks",
          "/history",
          "/submissions",
          "/settings",
          "/profile",
          "/inbox",
          "/admin",
          "/checkout",
          // Private per-user quiz history
          "/quiz/attempts",
        ],
        // Note: /login, /register and /forgot-password are intentionally NOT
        // disallowed — crawlers must be able to read their noindex meta tag
        // (see src/app/(auth)/layout.tsx) for them to drop out of the index.
      },
    ],
    sitemap: "https://www.quizsupport.com/sitemap.xml",
    host: "https://www.quizsupport.com",
  };
}
