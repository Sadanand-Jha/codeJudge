"use client";

import { use } from "react";
import AttemptReviewExperience from "@/components/quiz/live/AttemptReviewExperience";

export default function QuizResultsReviewPage({
  params,
}: {
  params: Promise<{ quizId: string; attemptId: string }>;
}) {
  const { attemptId } = use(params);

  return <AttemptReviewExperience attemptId={attemptId} key={attemptId} />;
}
