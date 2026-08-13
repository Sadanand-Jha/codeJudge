import { create } from "zustand";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { me } from "@/services/auth";

/** Global user profile as returned by the backend /auth/me + /api/v1/user/info. */
export interface UserProfile {
  id: string | number;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarIsMale?: boolean | null;
  bio?: string | null;
  mobile?: string | null;
  role?: string | null;
  rating?: number;
  maxRating?: number;
  isVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string | null;
  preferences?: Record<string, unknown>;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setAuth: (token: string, user: UserProfile) => void;
  /** Merge partial profile fields (avatar, name, bio, preferences…) into the current user. */
  setUser: (patch: Partial<UserProfile>) => void;
  /** Fetch the full profile from the backend (/auth/me) and merge it into the store. */
  fetchMe: () => Promise<UserProfile | null>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

  setUser: (patch) => {
    const { token, user } = get();
    if (!user) return;
    const merged: UserProfile = { ...user, ...patch };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(merged));
    }
    set({ user: merged, token, isAuthenticated: true });
  },

  fetchMe: async () => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await me();
      const fetched = res?.data?.user as UserProfile | undefined;
      if (!fetched) return null;
      get().setUser(fetched);
      return fetched;
    } catch {
      return null;
    }
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
