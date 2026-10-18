import type { Metadata } from "next";

// The quiz workspace is authenticated — every /quiz route redirects guests to
// /login (see (app)/layout.tsx), so none of it may be indexed. The noindex
// directive is also reinforced by X-Robots-Tag headers in proxy.ts.
export const metadata: Metadata = {
  title: "Online Quizzes & Practice Tests",
  description:
    "Take online quizzes on QuizSupport. Join with a quiz code, get instant results and track your scores.",
  robots: { index: false, follow: false },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
