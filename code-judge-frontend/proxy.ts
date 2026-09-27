import { NextResponse, type NextRequest } from "next/server";

// Inline focus-mode check to avoid importing client config in edge runtime
const FOCUS_MODE_ENABLED = true;

const FOCUS_ALLOWED_PREFIXES = [
  "/quiz",
  "/tests",
  "/creator/quizzes",
  "/creator/tests",
  "/creator/series",
  "/creator/question-bank",
  "/creator/questions",
  "/creator/problems",
  "/creator/resources",
  "/creator/create",
  "/login",
  "/register",
  "/forgot-password",
];

const FOCUS_ALLOWED_EXACT = ["/", "/creator"];

function isPathAllowed(pathname: string): boolean {
  if (!FOCUS_MODE_ENABLED) return true;
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
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
    // Redirect disallowed routes to the Quiz & Test hub with a query flag
    // so the UI can show a "section disabled" toast if desired.
    const url = request.nextUrl.clone();
    url.pathname = "/tests";
    url.searchParams.set("blocked", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
