import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { me } from "@/services/auth";

/** Global user profile as returned by the backend /auth/me + /api/v1/user/info. */
type NamedProfileValue = string | { name?: string | null };

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
  country?: NamedProfileValue | null;
  state?: NamedProfileValue | null;
  college?: NamedProfileValue | null;
  company?: NamedProfileValue | null;
  role?: string | null;
  rating?: number;
  maxRating?: number;
  isVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  preferences?: Record<string, unknown> & {
    theme?: string;
    accentColor?: string;
    compactMode?: boolean;
    animationSpeed?: string;
    preferredLanguage?: string;
    editorTheme?: string;
    editorFontSize?: number;
    tabWidth?: number;
    wordWrap?: boolean;
    autoSave?: boolean;
    vimMode?: boolean;
    emacsMode?: boolean;
  };
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setAuth: (token: string, user: UserProfile) => void;
  /** Merge partial profile fields (avatar, name, bio, preferences…) into the current user. */
  setUser: (patch: Partial<UserProfile>) => void;
  /**
   * Validate the session against the backend (/auth/me) and refresh the stored
   * profile. Relies on the httpOnly session cookie, so it restores sign-in even
   * when localStorage was cleared. Resolves with the fetched user or null.
   */
  fetchMe: () => Promise<UserProfile | null>;
  logout: () => void;
  hydrate: () => Promise<void>;
  setHasHydrated: (hasHydrated: boolean) => void;
}

// De-duplicates the /auth/me validation across the multiple hydrate() callers
// (AuthHydrator in the root layout + AppLayout), so a page reload triggers the
// session check exactly once.
let sessionCheck: Promise<void> | null = null;

/**
 * Auth state persisted in localStorage via zustand's persist middleware.
 * Token + full user profile are written on login/register and rehydrated on
 * every page load so pages can render user details immediately. The session is
 * then re-validated against /auth/me so a stale or cleared store never leaves
 * a signed-in user looking logged out.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },

      setUser: (patch) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, ...patch }, isAuthenticated: true });
      },

      fetchMe: async () => {
        try {
          const res = await me();
          const fetched = res?.data?.user as UserProfile | undefined;
          if (!fetched) {
            // Session ended / invalid (e.g. missing cookie) — clear the
            // persisted session so the UI no longer shows a signed-in user.
            get().logout();
            return null;
          }
          const current = get().user;
          if (current) {
            get().setUser(fetched);
          } else {
            // No persisted profile (fresh load / cleared storage) but the
            // httpOnly cookie still authenticated us — restore the session.
            set({ user: fetched, isAuthenticated: true });
          }
          return fetched;
        } catch (error: unknown) {
          // A 401 means the backend rejected the session (expired/revoked
          // token) — clear the persisted session. Transient network/5xx
          // errors are left alone so the user isn't logged out spuriously.
          if ((error as { response?: { status?: number } })?.response?.status === 401) {
            get().logout();
          }
          return null;
        }
      },

      logout: () => {
        if (typeof window !== "undefined") {
          // Remove every user-scoped persisted value, including Zustand
          // stores, quiz progress, cached avatar selection, and legacy keys.
          // Theme/layout preferences are intentionally included: a new user
          // must never inherit state from the previous account.
          for (const storage of [localStorage, sessionStorage]) {
            const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
              (key): key is string => Boolean(key)
            );
            keys.forEach((key) => {
              if (
                key.startsWith("byteclash_") ||
                key.startsWith("codejudge-") ||
                key === "token" ||
                key === "user"
              ) {
                storage.removeItem(key);
              }
            });
          }
        }
        set({ token: null, user: null, isAuthenticated: false, hasHydrated: true });
        // persist() writes the cleared state above; remove the container too so
        // no previous-user object remains in storage at all.
        if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEYS.AUTH);
      },

      hydrate: () => {
        if (sessionCheck) return sessionCheck;
        // The root AuthHydrator already restored and validated this browser
        // session. Route-level callers can safely reuse the persisted Zustand
        // user instead of issuing another /auth/me request on every mount.
        if (get().hasHydrated) return Promise.resolve();
        sessionCheck = (async () => {
          // persist is configured with skipHydration, so rehydration is
          // triggered manually (kept out of module init to avoid SSR/
          // hydration mismatches).
          await useAuthStore.persist.rehydrate();
          await get().fetchMe();
        })().finally(() => {
          sessionCheck = null;
        });
        return sessionCheck;
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: STORAGE_KEYS.AUTH,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // One-time import of the legacy separate keys (byteclash_token /
        // byteclash_user) written by previous builds.
        if (!state.token) {
          try {
            const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            const userStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
            if (token && userStr) {
              state.setAuth(token, JSON.parse(userStr));
              localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
              localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
            }
          } catch {
            // Invalid legacy data — ignore and start clean.
          }
        }
        state.setHasHydrated(true);
      },
    }
  )
);
