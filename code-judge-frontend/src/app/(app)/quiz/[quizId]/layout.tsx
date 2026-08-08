"use client";

import { usePathname } from "next/navigation";
import {
  isNestedQuizPath,
  parseQuizCodeFromPath,
} from "@/lib/quizWorkspace";
import { getQuizCode } from "@/services/quiz";
import { QuizSettingsProvider } from "@/components/quiz/creator/settings/QuizSettingsContext";
import QuizWorkspaceFrame from "@/components/quiz/creator/settings/QuizWorkspaceFrame";

/**
 * Quiz detail layout.
 *
 * For creator routes (`/quiz/{code}/settings/*`, `/quiz/{code}/problems/*`,
 * `/quiz/{code}/questions`, `/quiz/{code}/edit`) this mounts the nested
 * workspace: the app project sidebar slides away and the Quiz Settings
 * workspace frame takes over (AppLayout handles the project-sidebar slide).
 *
 * All other quiz routes (dashboard, live, lobby, attempt, …) render with the
 * normal app layout untouched.
 */
export default function QuizIdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (!isNestedQuizPath(pathname)) {
    return <>{children}</>;
  }

  const code = getQuizCode(parseQuizCodeFromPath(pathname));

  return (
    <QuizSettingsProvider code={code}>
      <QuizWorkspaceFrame>{children}</QuizWorkspaceFrame>
    </QuizSettingsProvider>
  );
}
