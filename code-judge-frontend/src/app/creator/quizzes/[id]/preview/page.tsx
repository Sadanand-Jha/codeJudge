"use client";
import { useParams } from "next/navigation";
import QuizPreviewContent from "@/components/creator/preview/QuizPreviewContent";

export default function QuizPreviewRoute() {
  const params = useParams();
  const id = params.id as string;
  if (!id) return <div className="p-8 text-sm text-text-muted">Quiz not found.</div>;
  return <QuizPreviewContent quizId={id} />;
}
