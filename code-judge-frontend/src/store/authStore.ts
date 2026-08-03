import { create } from "zustand";

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
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ token, user, isAuthenticated: true, hasHydrated: true });
          return;
        } catch {
          // Invalid user JSON, clear it
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      set({ hasHydrated: true });
    }
  },
}));
