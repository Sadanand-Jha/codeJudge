/**
 * Centralized localStorage keys for the ByteClash frontend.
 *
 * All keys MUST use the `byteclash_` prefix to keep the namespace consistent.
 */

export const STORAGE_KEYS = {
  AUTH_TOKEN: "byteclash_token",
  AUTH_USER: "byteclash_user",
  THEME: "byteclash_theme",
  QUIZ_CREATION: "byteclash_quiz_creation",
  QUIZ_PROGRESS_PREFIX: "byteclash_quiz_progress_",
  LIVE_QUIZ_STARTED_PREFIX: "byteclash_live_quiz_started_",
  WAITING_ROOM_THEME_STATE: "byteclash_waiting_room_theme_state",
  SPLIT_PANE_LEFT_WIDTH: "byteclash_split_pane_left_width",
  SPLIT_PANE_CONSOLE_HEIGHT: "byteclash_split_pane_console_height",
  AI_LEFT_PANEL: "byteclash_ai_left_panel",
  QUIZ_SYNC_SIGNATURE_PREFIX: "byteclash_quiz_sync_",
} as const;

/**
 * Legacy keys that may exist in users' localStorage from earlier builds.
 * Used by the migration runner in `app/layout.tsx`.
 */
export const LEGACY_STORAGE_KEYS = [
  "token",
  "user",
  "byteclash_theme",
  "byteclash_quiz_creation",
  "waiting_room_theme_state",
  "split-pane-left-width",
  "split-pane-console-height",
  "ai-left-panel",
  "quiz_progress_",
  "live_quiz_started_",
  // old quizdibba-prefixed keys (if any were ever written)
  "quizDibba_theme",
  "quizDibba_quiz_creation",
] as const;
