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

export function applyThemeToDOM(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}
