import { create } from "zustand";

/**
 * Global UI state shared across layouts/pages — auth modal and logout
 * confirmation are rendered by AppLayout but can be triggered from any
 * page (e.g. the code editor's own top bar).
 */
interface UIState {
  authModalOpen: boolean;
  authModalRedirect?: string;
  logoutConfirmOpen: boolean;

  openAuthModal: (redirectUrl?: string) => void;
  closeAuthModal: () => void;
  requestLogout: () => void;
  cancelLogout: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  authModalOpen: false,
  authModalRedirect: undefined,
  logoutConfirmOpen: false,

  openAuthModal: (redirectUrl) =>
    set({ authModalOpen: true, authModalRedirect: redirectUrl }),
  closeAuthModal: () => set({ authModalOpen: false, authModalRedirect: undefined }),
  requestLogout: () => set({ logoutConfirmOpen: true }),
  cancelLogout: () => set({ logoutConfirmOpen: false }),
}));
