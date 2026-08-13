import { create } from "zustand";
import { getIncomingCollaboratorRequests } from "@/services/quiz";

interface InboxState {
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Tracks the number of unread profile inbox items so the
 * profile sidebar can show a live badge. Currently driven by
 * pending collaborator requests — the only real inbox source.
 */
export const useInboxStore = create<InboxState>((set) => ({
  unread: 0,
  loading: false,
  refresh: async () => {
    try {
      const requests = await getIncomingCollaboratorRequests();
      const pending = (requests ?? []).filter((r) => r.status === "pending").length;
      set({ unread: pending, loading: false });
    } catch {
      set({ unread: 0, loading: false });
    }
  },
}));

/** Fetch the unread inbox count once on mount (idempotent per call). */
export async function loadInboxUnread(): Promise<void> {
  await useInboxStore.getState().refresh();
}
