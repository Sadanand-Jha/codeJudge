import { QuizStudio } from "@/components/creator/quiz-studio/StudioRouter";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Quiz — Creator Studio",
  description: "Build a professional quiz from scratch in the Creator Studio.",
};

export default function CreateQuizRoute() {
  return <QuizStudio />;
}
