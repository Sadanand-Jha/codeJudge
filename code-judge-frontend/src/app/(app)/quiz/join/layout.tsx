import type { Metadata } from "next";

// Joining a quiz requires an account — noindex (inherited by all of /quiz too).
export const metadata: Metadata = {
  title: "Join Quiz – Test Your Knowledge",
  description:
    "Join a QuizSupport quiz online with your access code. Instant results and score tracking.",
  robots: { index: false, follow: false },
};

export default function QuizJoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
