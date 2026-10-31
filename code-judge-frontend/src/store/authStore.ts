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
  countryId?: number | null;
  state?: NamedProfileValue | null;
  stateId?: number | null;
  college?: NamedProfileValue | null;
  collegeId?: number | null;
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

// Non-secret marker kept in memory for UI code that checks store.token. The
// actual JWT is only ever in the httpOnly session cookie.
const SESSION_SENTINEL = "session";

/** Remove a legacy JWT from the persisted Zustand blob, if one exists. */
function stripPersistedToken(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown> & {
      state?: Record<string, unknown>;
    };
    const target = parsed.state && typeof parsed.state === "object" ? parsed.state : parsed;
    if (target && typeof target === "object" && "token" in target) {
      delete target.token;
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(parsed));
    }
  } catch {
    // Corrupt storage — ignore; Zustand will overwrite it on the next write.
  }
}

/**
 * Auth state persisted in localStorage via zustand's persist middleware.
 * Only the non-sensitive user profile is persisted; credentials/session
 * tokens never are. The session is re-validated against /auth/me using the
 * httpOnly cookie, so cleared storage or a revoked session is handled safely.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (_token, user) => {
        // Ignore any token passed by callers: the session lives in the
        // httpOnly cookie, never in JS-accessible storage.
        set({ token: SESSION_SENTINEL, user, isAuthenticated: true });
      },

      setUser: (patch) => {
        const { user, token } = get();
        if (!user) return;
        set({
          token: token ?? SESSION_SENTINEL,
          user: { ...user, ...patch },
          isAuthenticated: true,
        });
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
            set({ token: SESSION_SENTINEL, user: fetched, isAuthenticated: true });
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
                key.startsWith("quizsupport_") ||
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
      // Never write a credential: only profile data is persisted client-side.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Even if an older build persisted a JWT, ignore it during rehydration.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<AuthState, "user" | "isAuthenticated">>;
        const authenticated = Boolean(saved.user) && Boolean(saved.isAuthenticated);
        return {
          ...current,
          user: saved.user ?? null,
          isAuthenticated: authenticated,
          token: authenticated ? SESSION_SENTINEL : null,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (typeof window === "undefined") return;
        // Remove credentials written by older builds. Keep the profile for a
        // brief optimistic render; fetchMe() clears it if /auth/me rejects it.
        let legacyUser: UserProfile | null = null;
        try {
          const rawUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
          if (rawUser) legacyUser = JSON.parse(rawUser) as UserProfile;
        } catch {
          // Invalid legacy data — ignore and start clean.
        }
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        stripPersistedToken();

        if (!state) return;
        if (!state.user && legacyUser) state.setAuth(SESSION_SENTINEL, legacyUser);
        state.setHasHydrated(true);
      },
    }
  )
);
