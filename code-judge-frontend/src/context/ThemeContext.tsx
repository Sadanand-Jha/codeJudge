"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  useCallback,
} from "react";
import { useAuthStore } from "@/store/authStore";
import { updatePreferences } from "@/services/auth";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getInitialTheme, applyThemeToDOM, Theme, DEFAULT_THEME } from "@/utils/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// External store for theme preference, used with useSyncExternalStore to
// avoid SSR/client hydration mismatch. getServerSnapshot always returns the
// default theme so server and client initial renders match. After mount,
// the mount effect notifies subscribers so getSnapshot re-reads from
// localStorage and the UI updates to the user's actual preference.
const themeStore = {
  _listeners: new Set<() => void>(),

  getSnapshot(): Theme {
    return getInitialTheme();
  },

  getServerSnapshot(): Theme {
    return DEFAULT_THEME;
  },

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  },

  _emit() {
    this._listeners.forEach((l) => l());
  },

  set(theme: Theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    applyThemeToDOM(theme);
    this._emit();
  },

  toggle(current: Theme): Theme {
    const next = current === "dark" ? "light" : "dark";
    this.set(next);
    return next;
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    themeStore.subscribe.bind(themeStore),
    themeStore.getSnapshot.bind(themeStore),
    themeStore.getServerSnapshot.bind(themeStore)
  );
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // After mount, notify subscribers so getSnapshot re-reads the theme from
  // localStorage (or system preference) and the UI reflects the user's choice.
  // The critical inline script in layout.tsx already set the correct DOM
  // attribute before first paint.
  useEffect(() => {
    themeStore._emit();
  }, []);

  // Safety net: keep the DOM attribute in sync with React state whenever it
  // changes (e.g. when the user toggles the theme).
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      themeStore.set(newTheme);
      if (isAuthenticated) {
        updatePreferences({ theme: newTheme }).catch(() => {
          // Silent fail for theme sync
        });
      }
    },
    [isAuthenticated]
  );

  const toggleTheme = useCallback(() => {
    themeStore.toggle(theme);
    if (isAuthenticated) {
      const next = theme === "dark" ? "light" : "dark";
      updatePreferences({ theme: next }).catch(() => {
        // Silent fail for theme sync
      });
    }
  }, [theme, isAuthenticated]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
