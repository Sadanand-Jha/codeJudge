import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/me/",
          "/dashboard",
          "/platform/",
          "/creator/",
          "/admin",
          "/login",
          "/register",
          "/forgot-password",
          "/settings",
          "/profile",
          "/inbox",
          "/checkout",
        ],
      },
    ],
    sitemap: "https://www.quizsupport.com/sitemap.xml",
  };
}
