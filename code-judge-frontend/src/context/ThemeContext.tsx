"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { updatePreferences } from "@/services/auth";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getInitialTheme, applyThemeToDOM, Theme } from "@/utils/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Keep the DOM attribute in sync with the React state.
  // The critical inline script in layout.tsx already set the correct value
  // before first paint; this effect is a safety net that keeps the attribute
  // correct whenever the theme changes (toggle, system preference updates, etc.).
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);

    // Sync to backend if authenticated
    if (isAuthenticated) {
      updatePreferences({ theme: newTheme }).catch(() => {
        // Silent fail for theme sync
      });
    }
  }, [isAuthenticated]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEYS.THEME, next);

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
