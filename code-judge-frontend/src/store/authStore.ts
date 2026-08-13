import { create } from "zustand";
import { STORAGE_KEYS } from "@/utils/storageKeys";

interface AuthState {
  token: string | null;
  user: { id: string; email: string; username?: string } | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setAuth: (token: string, user: { id: string; email: string; username?: string }) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  hasHydrated: false,

  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ token, user, isAuthenticated: true, hasHydrated: true });
          return;
        } catch {
          // Invalid user JSON, clear it
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        }
      }
      set({ hasHydrated: true });
    }
  },
}));
