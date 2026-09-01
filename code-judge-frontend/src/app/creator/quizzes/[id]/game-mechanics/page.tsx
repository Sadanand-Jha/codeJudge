"use client";

import { useParams } from "next/navigation";
import { StudioProvider } from "@/components/creator/quiz-studio/StudioProvider";
import { GameMechanicsPage } from "@/components/creator/quiz-studio/components/GameMechanicsPage";

export default function QuizGameMechanicsRoute() {
  const params = useParams();
  const quizId = (params.id as string) || (params as any).quizId;

  if (!quizId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Quiz not found.</p>
      </div>
    );
  }

  return (
    <StudioProvider editMode initialQuizId={quizId}>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <GameMechanicsPage />
      </div>
    </StudioProvider>
  );
}
