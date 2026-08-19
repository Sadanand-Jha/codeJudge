import { STORAGE_KEYS } from "@/utils/storageKeys";

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return null;
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

// Duration must match the CSS transition set in globals.css under the
// `html.theme-transition` scoped rule.
const THEME_TRANSITION_CLASS = "theme-transition";
const THEME_TRANSITION_MS = 320;

let themeTransitionTimer: ReturnType<typeof setTimeout> | null = null;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Temporarily adds a `theme-transition` class to <html> for the duration of a
 * theme switch. The CSS scoped to that class forces every element to ease its
 * theme colors together with the SAME duration and easing, so the whole
 * interface changes atmosphere as one unit instead of component-by-component.
 * Under prefers-reduced-motion the switch stays instant (no class added).
 */
function startThemeTransition(): void {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion()) return;
  const root = document.documentElement;
  root.classList.add(THEME_TRANSITION_CLASS);
  if (themeTransitionTimer !== null) clearTimeout(themeTransitionTimer);
  themeTransitionTimer = setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
    themeTransitionTimer = null;
  }, THEME_TRANSITION_MS);
}

export function applyThemeToDOM(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === theme) return;
  root.setAttribute("data-theme", theme);
  startThemeTransition();
}
