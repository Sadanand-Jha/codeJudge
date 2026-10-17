import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Quiz – Test Your Knowledge",
  description:
    "Join a QuizSupport quiz online with your access code. Instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/quiz/join" },
};

export default function QuizJoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
