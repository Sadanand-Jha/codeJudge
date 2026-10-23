const BACK_NAVIGATION_KEY = "quiz:back-navigation";
const BACK_NAVIGATION_TTL_MS = 3000;

type BackNavigationMarker = {
  at: number;
  path: string;
};

/** Called from a global popstate listener so the destination route knows the
 * current navigation was a browser back/forward traversal, not a link click. */
export function markQuizBackNavigation() {
  if (typeof window === "undefined") return;
  try {
    const marker: BackNavigationMarker = {
      at: Date.now(),
      path: window.location.pathname,
    };
    window.sessionStorage.setItem(BACK_NAVIGATION_KEY, JSON.stringify(marker));
  } catch {
    // Storage can be unavailable (private mode); native nav type still works.
  }
}

/** True when this document load is a back/forward navigation, or a same-tab
 * history traversal just landed on this path. */
export function consumeQuizBackNavigation(): boolean {
  if (typeof window === "undefined") return false;

  let traversedToThisPath = false;
  try {
    const raw = window.sessionStorage.getItem(BACK_NAVIGATION_KEY);
    window.sessionStorage.removeItem(BACK_NAVIGATION_KEY);
    if (raw) {
      const marker = JSON.parse(raw) as Partial<BackNavigationMarker>;
      traversedToThisPath =
        marker.path === window.location.pathname &&
        typeof marker.at === "number" &&
        Date.now() - marker.at < BACK_NAVIGATION_TTL_MS;
    }
  } catch {
    // Ignore malformed markers.
  }

  if (traversedToThisPath) return true;

  const navigation = window.performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navigation?.type !== "back_forward") return false;

  // Only trust the document navigation type while we are still on the URL that
  // document loaded with. After client-side routing the entry still describes
  // the original load and must not block an intentional lobby/reattempt click.
  try {
    return new URL(navigation.name || window.location.href).pathname === window.location.pathname;
  } catch {
    return false;
  }
}
