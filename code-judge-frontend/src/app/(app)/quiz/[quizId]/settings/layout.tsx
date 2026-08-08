"use client";

import { use } from "react";
import { getQuizCode } from "@/services/quiz";
import { QuizSettingsProvider } from "@/components/quiz/creator/settings/QuizSettingsContext";
import QuizSettingsShell from "@/components/quiz/creator/settings/QuizSettingsShell";

export default function QuizSettingsLayout({ params, children }: { params: Promise<{ quizId: string }>; children: React.ReactNode }) {
  const { quizId } = use(params);
  const code = getQuizCode(quizId);

  return (
    <QuizSettingsProvider code={code}>
      <QuizSettingsShell>{children}</QuizSettingsShell>
    </QuizSettingsProvider>
  );
}
