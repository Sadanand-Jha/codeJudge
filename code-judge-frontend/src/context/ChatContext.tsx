"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import type { LiveUsage } from "@/services/ai";

/**
 * A single message in the AI assistant conversation.
 *
 * `role` follows the LLM chat format. The assistant's instructions are NOT
 * stored client-side — the backend builds the full conversation (system prompt
 * + context + history) under the `conversationId` held by this context. The
 * optional fields beyond `role`/`content` only power the live streaming UI
 * (reasoning, usage, …).
 */
export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: string[];
  reasoningContent?: string;
  isReasoning?: boolean;
  isStreaming?: boolean;
  usage?: LiveUsage;
  timeMs?: number;
}

const makeId = () =>
  `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createConversationId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface ChatContextValue {
  chatHistory: ChatMessage[];
  setChatHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  addMessage: (message: Omit<ChatMessage, "id">) => ChatMessage;
  clearChat: () => void;
  /** Stable id identifying this conversation on the backend. */
  conversationId: string;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Owns the AI assistant conversation in React memory only.
 *
 * The history lives exclusively in this provider's `useState` — it is never
 * written to localStorage/sessionStorage/IndexedDB/cookies or the backend, so a
 * full page reload (or a fresh tab) starts with a brand-new conversation. The
 * conversation history itself is persisted server-side under `conversationId`.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState(createConversationId);

  const addMessage = useCallback((message: Omit<ChatMessage, "id">): ChatMessage => {
    const full: ChatMessage = { ...message, id: makeId() };
    setChatHistory((prev) => [...prev, full]);
    return full;
  }, []);

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setConversationId(createConversationId());
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({ chatHistory, setChatHistory, addMessage, clearChat, conversationId }),
    [chatHistory, addMessage, clearChat, conversationId]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}