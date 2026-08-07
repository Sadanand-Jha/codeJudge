"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { updatePreferences } from "@/services/auth";
import { STORAGE_KEYS } from "@/utils/storageKeys";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = STORAGE_KEYS.THEME;

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isHydrated, setIsHydrated] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Load theme on mount
  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) {
      setThemeState(stored);
    } else {
      setThemeState(getSystemTheme());
    }
    setIsHydrated(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isHydrated) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme, isHydrated]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);

    // Sync to backend if authenticated
    if (isAuthenticated) {
      updatePreferences({ theme: newTheme }).catch(() => {
        // Silent fail for theme sync
      });
    }
  }, [isAuthenticated]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);

      // Sync to backend if authenticated
      if (isAuthenticated) {
        updatePreferences({ theme: next }).catch(() => {
          // Silent fail for theme sync
        });
      }

      return next;
    });
  }, [isAuthenticated]);

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