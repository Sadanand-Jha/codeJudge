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
 * `role` follows the LLM chat format; the `system` message carries the
 * assistant's instructions and is always restored when a session starts.
 * The optional fields beyond `role`/`content` only power the live streaming UI
 * (reasoning, usage, …) and are dropped when the history is sent to the model.
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

/** Instructions restored for every fresh conversation. */
export const DEFAULT_SYSTEM_MESSAGE = `You are a helpful, highly capable AI assistant running locally.
Follow these guidelines:
- Be concise and direct in your answers.
- If you do not know the answer, say "I don't know" rather than making something up.
- Format your responses using Markdown for readability (use bolding, lists, and code blocks where appropriate).
- Maintain a friendly but professional tone.`;

const makeId = () =>
  `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface ChatContextValue {
  chatHistory: ChatMessage[];
  setChatHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  addMessage: (message: Omit<ChatMessage, "id">) => ChatMessage;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Owns the AI assistant conversation in React memory only.
 *
 * The history lives exclusively in this provider's `useState` — it is never
 * written to localStorage/sessionStorage/IndexedDB/cookies or the backend, so a
 * full page reload (or a fresh tab) starts with a brand-new conversation that
 * always begins with the system message.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: "system", role: "system", content: DEFAULT_SYSTEM_MESSAGE },
  ]);

  const addMessage = useCallback((message: Omit<ChatMessage, "id">): ChatMessage => {
    const full: ChatMessage = { ...message, id: makeId() };
    setChatHistory((prev) => [...prev, full]);
    return full;
  }, []);

  const clearChat = useCallback(() => {
    setChatHistory([{ id: "system", role: "system", content: DEFAULT_SYSTEM_MESSAGE }]);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({ chatHistory, setChatHistory, addMessage, clearChat }),
    [chatHistory, addMessage, clearChat]
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
