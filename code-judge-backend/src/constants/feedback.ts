/**
 * Feedback categories accepted from signed-in users on the contact page.
 * Keep in sync with src/config/feedback.ts in the frontend — the API rejects
 * any category outside this list.
 */
export const FEEDBACK_CATEGORIES = ["bug", "feature", "content", "billing", "other"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 2000;

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === "string" && (FEEDBACK_CATEGORIES as readonly string[]).includes(value);
}
