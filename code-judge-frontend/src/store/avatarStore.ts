import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PREDEFINED_AVATARS, getPredefinedAvatar } from "@/config/dicebear";

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

export function useSavedAvatar() {
  const savedAvatarId = useAvatarStore((s) => s.savedAvatarId);
  return getPredefinedAvatar(savedAvatarId) ?? PREDEFINED_AVATARS[0] ?? null;
}

export function useCurrentAvatar() {
  const savedAvatarId = useAvatarStore((s) => s.savedAvatarId);
  const pendingAvatarId = useAvatarStore((s) => s.pendingAvatarId);
  const id = pendingAvatarId ?? savedAvatarId;
  return getPredefinedAvatar(id) ?? PREDEFINED_AVATARS[0] ?? null;
}