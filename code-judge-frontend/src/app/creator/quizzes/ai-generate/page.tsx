import { AiQuizGenerator } from "@/components/creator/ai-quiz-generator/AiQuizGenerator";
import { WHOLE_QUIZ_AI_ENABLED } from "@/config/creatorFeatures";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "AI Generate Quiz — Creator Studio",
  description: "Generate a complete quiz from a problem list using AI.",
};

export default function AiGenerateQuizRoute() {
  if (!WHOLE_QUIZ_AI_ENABLED) redirect("/creator/quizzes");
  return <AiQuizGenerator />;
}
