"use client";
import { useParams } from "next/navigation";
import QuizAnalyticsContent from "@/components/creator/analytics/QuizAnalyticsContent";

export default function QuizAnalyticsRoute() {
  const params = useParams();
  const id = params.id as string;
  if (!id) return <div className="p-8 text-sm text-text-muted">Quiz not found.</div>;
  return <QuizAnalyticsContent quizId={id} />;
}
