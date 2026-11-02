const AUTH_PAGE_PATHS = ["/login", "/register", "/forgot-password"];

/**
 * Only same-origin app paths are accepted as post-auth destinations. This keeps
 * ?next= from becoming an open redirect while preserving query strings such as
 * plan and pack deep links.
 */
export function safeNextPath(value: string | null): string | null {
  if (!value || value.length > 512 || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  // Backslashes are treated as slashes by some browsers, which would turn
  // "/\evil.com" into an external navigation.
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;

  const path = value.split(/[?#]/, 1)[0];
  if (
    AUTH_PAGE_PATHS.some(
      (authPath) => path === authPath || path.startsWith(`${authPath}/`)
    )
  ) {
    return null;
  }
  return value;
}
