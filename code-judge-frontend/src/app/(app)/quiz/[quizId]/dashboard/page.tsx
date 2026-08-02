"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuizDashboard from "@/components/quiz/QuizDashboard";
import { StudioQuestion } from "@/types/quiz";
import { getQuizCode } from "@/services/quiz";

interface DashboardPageProps {
  params: { quizId: string };
}

export default function QuizDashboardPage({ params }: DashboardPageProps) {
  const router = useRouter();
  const [quizName, setQuizName] = useState("Untitled Quiz");
  const [questions, setQuestions] = useState<StudioQuestion[]>([]);

  return (
    <QuizDashboard
      quizId={getQuizCode(params?.quizId || "new")}
      quizName={quizName}
      initialQuestions={questions}
      onExit={() => router.push("/quiz")}
    />
  );
}
