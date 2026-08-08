"use client";

import { use } from "react";
import QuizProblemsPreview from "@/components/quiz/creator/settings/QuizProblemsPreview";

export default function QuizProblemDetailPage({ params }: { params: Promise<{ problemId: string }> }) {
  const { problemId } = use(params);
  return <QuizProblemsPreview focusId={problemId} />;
}
