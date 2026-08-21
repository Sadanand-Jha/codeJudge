import { AiQuizGenerator } from "@/components/creator/ai-quiz-generator/AiQuizGenerator";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Generate Quiz — Creator Studio",
  description: "Generate a complete quiz from a problem list using AI.",
};

export default function AiGenerateQuizRoute() {
  return <AiQuizGenerator />;
}
