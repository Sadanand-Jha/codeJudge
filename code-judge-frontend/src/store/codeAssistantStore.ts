"use client";

import { create } from "zustand";
import type { LiveUsage } from "@/services/ai";

/** A single message in the Code Assistant conversation. */
export interface CodeAssistantMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  reasoningContent?: string;
  isReasoning?: boolean;
  isStreaming?: boolean;
  usage?: LiveUsage;
  timeMs?: number;
}

const makeId = () =>
  `code-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Client-generated conversation id. The backend persists the conversation
 * history under this id and sends it back on every turn; the client keeps it
 * stable across panel sessions so follow-up questions retain full context.
 */
const createConversationId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface CodeAssistantConversationState {
  /** Stable id identifying this conversation on the backend. */
  conversationId: string;
  /** The conversation: user/assistant turns (no system message stored client-side). */
  messages: CodeAssistantMessage[];
  addMessage: (
    message: Omit<CodeAssistantMessage, "id">
  ) => CodeAssistantMessage;
  patchMessage: (id: string, patch: Partial<CodeAssistantMessage>) => void;
  clearConversation: () => void;
}

/**
 * Persistent conversation store for the Code Assistant panel.
 *
 * Mirrors ChatContext (used by the quiz AiAssistantPanel): the conversation
 * lives at module scope so it survives closing/reopening the panel and page
 * navigation within the SPA. The conversation history is stored on the
 * BACKEND under `conversationId` — this store only keeps the display copy plus
 * the id needed to resume it.
 */
export const useCodeAssistantStore = create<CodeAssistantConversationState>(
  (set) => ({
    conversationId: createConversationId(),
    messages: [],
    addMessage: (message) => {
      const full: CodeAssistantMessage = { ...message, id: makeId() };
      set((s) => ({ messages: [...s.messages, full] }));
      return full;
    },
    patchMessage: (id, patch) =>
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
      })),
    clearConversation: () =>
      set({ conversationId: createConversationId(), messages: [] }),
  })
);