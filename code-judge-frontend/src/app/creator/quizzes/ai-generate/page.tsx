import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "AI Generate Quiz — Creator Studio",
  description: "Generate a complete quiz from a problem list using AI.",
};

export default function AiGenerateQuizRoute() {
  redirect("/creator/quizzes/create?ai=1");
}
