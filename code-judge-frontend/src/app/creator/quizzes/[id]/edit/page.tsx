"use client";

import { useParams } from "next/navigation";
import { QuizEditor } from "@/components/creator/quiz-studio/StudioRouter";

export default function EditQuizRoute() {
  const params = useParams();
  const quizId = params.id as string;

  if (!quizId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Quiz not found.</p>
      </div>
    );
  }

  return <QuizEditor quizId={quizId} />;
}
