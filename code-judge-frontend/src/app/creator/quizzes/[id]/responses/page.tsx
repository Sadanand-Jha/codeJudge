"use client";
import { useParams } from "next/navigation";
import StudioResponsesPage from "@/components/creator/responses/StudioResponsesPage";

export default function CreatorQuizResponsesPage() {
  const params = useParams();
  const id = params.id as string;
  return <StudioResponsesPage quizId={id} />;
}
