"use client";

import QuizSettingsShell from "@/components/quiz/creator/settings/QuizSettingsShell";

/**
 * Settings workspace layout.
 *
 * The provider and the workspace frame (Quiz Settings sidebar + problem nav)
 * are mounted one level up in `quiz/[quizId]/layout.tsx`, which is active for
 * all creator routes. This layout only renders the persistent settings shell:
 * the page header, mobile tab nav and the start/end confirmation modals.
 */
export default function QuizSettingsLayout({ children }: { children: React.ReactNode }) {
  return <QuizSettingsShell>{children}</QuizSettingsShell>;
}
