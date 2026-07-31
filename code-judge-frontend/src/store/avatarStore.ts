import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPredefinedAvatar } from "@/config/dicebear";

interface AvatarState {
  savedAvatarId: string;
  pendingAvatarId: string | null;
  setSavedAvatar: (id: string) => void;
  setPendingAvatar: (id: string | null) => void;
}

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      savedAvatarId: "male-3",
      pendingAvatarId: null,
      setSavedAvatar: (id) => set({ savedAvatarId: id || "", pendingAvatarId: null }),
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
  if (!savedAvatarId) return null;
  return getPredefinedAvatar(savedAvatarId) ?? null;
}

export function useCurrentAvatar() {
  const savedAvatarId = useAvatarStore((s) => s.savedAvatarId);
  const pendingAvatarId = useAvatarStore((s) => s.pendingAvatarId);
  const id = pendingAvatarId ?? savedAvatarId;
  if (!id) return null;
  return getPredefinedAvatar(id) ?? null;
}