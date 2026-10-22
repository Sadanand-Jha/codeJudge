import { NextResponse, type NextRequest } from "next/server";

// Inline focus-mode check to avoid importing client config in edge runtime
const FOCUS_MODE_ENABLED = true;

// Keep the page source in the build, but deny these student modules before
// evaluating any allow rules. This is enforced at Vercel's request boundary.
const FOCUS_BLOCKED_STUDENT_PREFIXES = [
  "/contest",
  "/contests",
  "/problems",
  "/preparation",
  "/editor",
  "/profile",
  "/settings",
  "/tests",
  "/dashboard",
  "/analytics",
  "/bookmarks",
  "/history",
  "/submissions",
  "/inbox",
  "/achievements",
  "/ai",
  "/collections",
  "/feed",
  "/leaderboard",
];

const FOCUS_ALLOWED_PREFIXES = [
  "/quiz",
  "/platform",
  "/creator",
  "/login",
  "/register",
  "/forgot-password",
  "/meet-the-developer",
  "/about",
  "/contact",
  "/privacy",
  "/docs",
  "/pricing",
];

// Blocked pages kept in the build that redirect to the homepage instead of
// the quiz hub. Mirrors FOCUS_HOME_REDIRECT_PREFIXES in src/config/focusMode.ts.
const FOCUS_HOME_REDIRECT_PREFIXES: string[] = [];


const FOCUS_ALLOWED_EXACT = ["/", "/robots.txt", "/sitemap.xml"];

// Authenticated workspaces and account-only screens: never index, even when
// they are reachable through the focus-mode allowlist. Mirrors the `robots`
// metadata exported by the (auth), quiz and creator layouts.
const NOINDEX_NOFOLLOW_PREFIXES = ["/quiz", "/creator", "/platform"];
const NOINDEX_FOLLOW_PREFIXES = ["/login", "/register", "/forgot-password"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isPathAllowed(pathname: string): boolean {
  if (!FOCUS_MODE_ENABLED) return true;
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (
    FOCUS_BLOCKED_STUDENT_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
    )
  ) {
    return false;
  }
  if (FOCUS_ALLOWED_EXACT.includes(normalized)) return true;
  for (const prefix of FOCUS_ALLOWED_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(prefix + "/")) return true;
  }
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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (FOCUS_MODE_ENABLED && !isPathAllowed(pathname)) {
    const url = request.nextUrl.clone();
    const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

    // Marketing pages that are blocked but kept in the build: send visitors
    // home instead of the quiz hub.
    if (matchesPrefix(normalized, FOCUS_HOME_REDIRECT_PREFIXES)) {
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Redirect disallowed routes to the Quiz hub with a query flag
    // so the UI can show a "section disabled" toast if desired.
    url.pathname = "/quiz";
    url.searchParams.set("blocked", pathname);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (matchesPrefix(normalized, NOINDEX_NOFOLLOW_PREFIXES)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (matchesPrefix(normalized, NOINDEX_FOLLOW_PREFIXES)) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
