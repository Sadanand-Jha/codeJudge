import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/store/authStore";
import {
  PREDEFINED_AVATARS,
  getPredefinedAvatar,
  getPredefinedAvatarByUrl,
} from "@/config/dicebear";

interface AvatarState {
  savedAvatarId: string;
  pendingAvatarId: string | null;
  setSavedAvatar: (id: string) => void;
  setPendingAvatar: (id: string | null) => void;
}

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      savedAvatarId: "avatar-1",
      pendingAvatarId: null,
      setSavedAvatar: (id) => set({ savedAvatarId: id || "avatar-1", pendingAvatarId: null }),
      setPendingAvatar: (id) => set({ pendingAvatarId: id || null }),
    }),
    {
      name: "codejudge-avatar",
      partialize: (state) => ({ savedAvatarId: state.savedAvatarId }),
    }
  )
);

export interface EffectiveAvatar {
  url: string;
  label: string;
}

/**
 * Resolve the current user's avatar from the persisted auth store
 * (`user.avatarUrl`, synced with the backend on login/profile updates).
 * Falls back to the locally saved predefined avatar only when the server
 * has no avatar yet — so the navbar, settings, and profile always agree.
 */
export function useSavedAvatar(): EffectiveAvatar | null {
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl || null);
  const savedAvatarId = useAvatarStore((s) => s.savedAvatarId);

  if (avatarUrl) {
    const matched = getPredefinedAvatarByUrl(avatarUrl);
    return { url: avatarUrl, label: matched?.label ?? "Avatar" };
  }
  return getPredefinedAvatar(savedAvatarId) ?? PREDEFINED_AVATARS[0] ?? null;
}

export function useCurrentAvatar(): EffectiveAvatar | null {
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl || null);
  const savedAvatarId = useAvatarStore((s) => s.savedAvatarId);
  const pendingAvatarId = useAvatarStore((s) => s.pendingAvatarId);

  if (avatarUrl) {
    const matched = getPredefinedAvatarByUrl(avatarUrl);
    return { url: avatarUrl, label: matched?.label ?? "Avatar" };
  }
  const id = pendingAvatarId ?? savedAvatarId;
  return getPredefinedAvatar(id) ?? PREDEFINED_AVATARS[0] ?? null;
}