/**
 * Conversation history store — backend-owned.
 *
 * The client only sends a `conversationId`; the backend persists the previous
 * user/assistant turns and replays them to the model with a sensible token
 * budget. Storage is Redis (matching the rest of the platform) with an
 * in-memory fallback so a Redis hiccup never breaks the chat.
 */
import redisClient from "../config/redis.ts";
import { MAX_HISTORY_CHARS, MAX_HISTORY_MESSAGES, CONVERSATION_TTL_SECONDS } from "./config.ts";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const memoryStore = new Map<string, HistoryMessage[]>();

const keyFor = (conversationId: string) => `ai:conversation:${conversationId}`;

const estimateChars = (msgs: HistoryMessage[]): number =>
  msgs.reduce((acc, m) => acc + m.content.length, 0);

/**
 * Keep only the most recent turns that fit the configured token budget.
 * Messages are dropped oldest-first; the tail (latest context) always survives.
 */
export const trimHistory = (
  msgs: HistoryMessage[],
  maxChars: number = MAX_HISTORY_CHARS,
  maxMessages: number = MAX_HISTORY_MESSAGES
): HistoryMessage[] => {
  const clamped = msgs.slice(-maxMessages);
  let total = estimateChars(clamped);
  let start = 0;
  while (total > maxChars && start < clamped.length - 1) {
    total -= clamped[start].content.length;
    start += 1;
  }
  return clamped.slice(start);
};

const redis = {
  async get(conversationId: string): Promise<HistoryMessage[] | null> {
    try {
      const raw = await redisClient.get(keyFor(conversationId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as HistoryMessage[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  async set(conversationId: string, messages: HistoryMessage[]): Promise<boolean> {
    try {
      await redisClient.set(keyFor(conversationId), JSON.stringify(messages), {
        EX: CONVERSATION_TTL_SECONDS,
      });
      return true;
    } catch {
      return false;
    }
  },
};

/** Retrieve stored history, falling back to memory when Redis is unavailable. */
export const getConversation = async (
  conversationId: string
): Promise<HistoryMessage[]> => {
  const fromRedis = await redis.get(conversationId);
  if (fromRedis) return trimHistory(fromRedis);
  const fromMemory = memoryStore.get(conversationId);
  return fromMemory ? trimHistory(fromMemory) : [];
};

/** Persist new turns, keeping memory and Redis in sync. */
export const appendConversation = async (
  conversationId: string,
  newMessages: HistoryMessage[]
): Promise<void> => {
  const existing = await getConversation(conversationId);
  const next = trimHistory([...existing, ...newMessages]);
  memoryStore.set(conversationId, next);
  await redis.set(conversationId, next);
};

/** Drop a conversation entirely. */
export const clearConversation = async (conversationId: string): Promise<void> => {
  memoryStore.delete(conversationId);
  try {
    await redisClient.del(keyFor(conversationId));
  } catch {
    // ignore — memory is already cleared.
  }
};