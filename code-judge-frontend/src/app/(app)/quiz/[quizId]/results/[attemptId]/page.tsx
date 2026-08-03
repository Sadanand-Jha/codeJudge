"use client";

import { use } from "react";
import AttemptReviewExperience from "@/components/quiz/live/AttemptReviewExperience";

export default function QuizResultsReviewPage({
  params,
}: {
  params: Promise<{ quizId: string; attemptId: string }>;
}) {
  const { quizId, attemptId } = use(params);

  return <AttemptReviewExperience key={`${quizId}-${attemptId}`} />;
}