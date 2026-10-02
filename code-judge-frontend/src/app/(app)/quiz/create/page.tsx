import { redirect } from "next/navigation";

/** Backward-compatible entry point for older student-workspace links. */
export default function CreateQuizPage() {
  redirect("/creator/quizzes/create");
}
