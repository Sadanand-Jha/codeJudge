/**
 * Centralized AI model & feature configuration.
 *
 * Everything that tunes the language model lives here and is read from the
 * server environment — never from client input. The frontend cannot influence
 * model selection, temperature, token limits or feature behavior.
 */

/**
 * Token budget (approximate) for the conversation history we replay to the
 * model. Older messages beyond this budget are dropped so a long chat cannot
 * blow up the prompt. Estimated as characters/4 (a rough LLM token heuristic).
 */
export const MAX_HISTORY_CHARS = 32_000;

/** Absolute cap on the number of stored turns replayed to the model. */
export const MAX_HISTORY_MESSAGES = 40;

/** Model temperature for chat completions. */
export const AI_TEMPERATURE = Number(process.env.AI_TEMPERATURE ?? 0.7);

/** Cap on model output tokens (approximate, provider-dependent). */
export const AI_MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 1024);

/** How long a conversation's history is kept in the conversation store. */
export const CONVERSATION_TTL_SECONDS = Number(
  process.env.AI_CONVERSATION_TTL_SECONDS ?? 7 * 24 * 60 * 60
);

/** Model id served by the OpenAI-compatible endpoint. */
export const AI_MODEL = process.env.LM_STUDIO_MODEL;

/** Base URL of the OpenAI-compatible endpoint. */
export const AI_BASE_URL = process.env.LM_STUDIO_URL;