import type { MetadataRoute } from "next";

const BASE = "https://www.quizsupport.com";

// Public, crawlable pages only — login, dashboard and private app routes
// (/login, /register, /dashboard, /platform, /creator, /profile, …) are
// intentionally excluded. /feed/* and /problems/* are excluded too because
// focus-mode redirects them to /quiz (no open catalogue — quizzes are joined
// by access code, and getAllQuizzes only returns the creator's own quizzes).
const STATIC_PATHS = [
  "/",
  "/quiz",
  "/quiz/join",
  "/quiz/attempts",
  "/about",
  "/contact",
  "/privacy",
  "/pricing",
  "/docs",
  "/meet-the-developer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => ({
    url: `${BASE}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : ("weekly" as const),
    priority: path === "/" ? 1 : 0.7,
  }));
}
