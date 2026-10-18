/**
 * Feedback categories shown on the contact page. Keep in sync with the API's
 * allowed list (src/constants/feedback.ts in code-judge-backend) — the server
 * rejects any category that is not listed there.
 */
export interface FeedbackCategoryOption {
  id: string;
  label: string;
  hint: string;
}

export const FEEDBACK_CATEGORIES: FeedbackCategoryOption[] = [
  {
    id: "bug",
    label: "Bug or problem",
    hint: "Something is broken or not working as expected.",
  },
  {
    id: "feature",
    label: "Feature request",
    hint: "An idea that would make QuizSupport better.",
  },
  {
    id: "content",
    label: "Quiz or question issue",
    hint: "A question, answer key or paper that looks wrong.",
  },
  {
    id: "billing",
    label: "Credits and billing",
    hint: "AI credits, payments or refunds.",
  },
  {
    id: "other",
    label: "Something else",
    hint: "Anything that does not fit the categories above.",
  },
];

export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 2000;
