"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import QuizDashboard from "@/components/quiz/QuizDashboard";
import { StudioQuestion } from "@/types/quiz";
import { getQuizCode } from "@/services/quiz";

export default function QuizDashboardPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const [quizName, setQuizName] = useState("Untitled Quiz");
  const [questions, setQuestions] = useState<StudioQuestion[]>([]);

  return (
    <QuizDashboard
      quizId={getQuizCode(quizId || "new")}
      quizName={quizName}
      initialQuestions={questions}
      onExit={() => router.push("/quiz")}
    />
  );
}