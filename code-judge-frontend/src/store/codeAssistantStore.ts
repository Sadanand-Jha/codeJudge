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

/** Stable id of the stored system message (refreshed with live context each send). */
export const CODE_ASSISTANT_SYSTEM_ID = "code-assistant-system";

const makeId = () =>
  `code-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialMessage = (): CodeAssistantMessage => ({
  id: CODE_ASSISTANT_SYSTEM_ID,
  role: "system",
  content: "",
});

interface CodeAssistantConversationState {
  /** The full conversation: system message + user/assistant turns. */
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
 * navigation within the SPA, giving the model full context for follow-up
 * turns. The system message is stored too, but its content is rebuilt with the
 * LIVE editor content on every send so the model always sees the latest code
 * plus the whole prior conversation.
 */
export const useCodeAssistantStore = create<CodeAssistantConversationState>(
  (set) => ({
    messages: [initialMessage()],
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
    clearConversation: () => set({ messages: [initialMessage()] }),
  })
);
