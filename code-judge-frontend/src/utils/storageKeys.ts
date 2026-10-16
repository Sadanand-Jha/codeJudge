/**
 * Centralized localStorage keys for the QuizSupport frontend.
 *
 * All keys MUST use the `quizsupport_` prefix to keep the namespace consistent.
 */

export const STORAGE_KEYS = {
  AUTH_TOKEN: "quizsupport_token",
  AUTH_USER: "quizsupport_user",
  /** Combined auth state (token + user) persisted by zustand persist. */
  AUTH: "quizsupport_auth",
  /** Dedicated platform (owner) session — isolated from regular auth. */
  PLATFORM_TOKEN: "quizsupport_platform_token",
  PLATFORM_EMAIL: "quizsupport_platform_email",
  THEME: "quizsupport_theme",
  QUIZ_CREATION: "quizsupport_quiz_creation",
  QUIZ_PROGRESS_PREFIX: "quizsupport_quiz_progress_",
  LIVE_QUIZ_STARTED_PREFIX: "quizsupport_live_quiz_started_",
  WAITING_ROOM_THEME_STATE: "quizsupport_waiting_room_theme_state",
  SPLIT_PANE_LEFT_WIDTH: "quizsupport_split_pane_left_width",
  SPLIT_PANE_CONSOLE_HEIGHT: "quizsupport_split_pane_console_height",
  AI_LEFT_PANEL: "quizsupport_ai_left_panel",
  QUIZ_SYNC_SIGNATURE_PREFIX: "quizsupport_quiz_sync_",
  /** Per-quiz audience config, keyed by quiz code. */
  QUIZ_AUDIENCE_PREFIX: "quizsupport_quiz_audience_",
} as const;

/**
 * Legacy keys that may exist in users' localStorage from earlier builds.
 * Used by the migration runner in `app/layout.tsx`.
 */
export const LEGACY_STORAGE_KEYS = [
  "token",
  "user",
  "quizsupport_theme",
  "quizsupport_quiz_creation",
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
