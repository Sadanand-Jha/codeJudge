import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online Quizzes & Practice Tests",
  description:
    "Take online quizzes on QuizSupport. Join with a quiz code, get instant results and track your scores.",
  alternates: { canonical: "https://www.quizsupport.com/quiz" },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
