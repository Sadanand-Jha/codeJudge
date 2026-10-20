"use client";

import { QuestionBankPage } from "@/components/creator/questions/QuestionBankPage";

const subjects = [
  "Design and Analysis of Algorithms",
  "Operating Systems",
  "Database Management Systems",
];
const types = ["Single Choice", "Multiple Choice", "Integer", "True/False", "Subjective"];
const difficulties = ["Easy", "Medium", "Hard"];
const topics = ["recurrence", "graphs", "scheduling", "memory", "sql", "complexity", "np"];

const questions = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  quiz_id: i % 4 === 0 ? 21 : null,
  subject_id: 1,
  subject: subjects[i % subjects.length],
  chapter_id: 1,
  chapter: i % 3 === 0 ? "Divide and Conquer" : null,
  topic_id: 1,
  topic: topics[i % topics.length],
  question_type: types[i % types.length],
  question_text:
    i === 3
      ? "Solve the recurrence T(n) = √n T(√n) + n for n a power of 2 with an extremely long statement so that the truncation behaviour of the question column can be verified end to end."
      : `Sample bank question ${i + 1}: which option best describes the core idea behind ${topics[i % topics.length]}?`,
  question_html:
    i === 2
      ? "<p>Given the recurrence <code>T(n) = 2T(n/2) + n</code>, what is the asymptotic complexity?</p>"
      : null,
  options: [
    { text: "Option A — first candidate answer", isCorrect: i % 2 === 0 },
    { text: "Option B — second candidate answer", isCorrect: i % 2 === 1 },
    { text: "Option C — third candidate answer", isCorrect: false },
    { text: "Option D — fourth candidate answer", isCorrect: false },
  ],
  answers: [],
  explanation: i % 3 === 0 ? "Apply the Master theorem case 2 to get the bound." : null,
  hint: i % 2 === 0 ? "Compare n^(log_b a) with f(n)." : null,
  difficulty: difficulties[i % difficulties.length],
  source: "ai",
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  ownership_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
}));

if (typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/v1/user/ai/question-bank")) {
      return new Response(JSON.stringify({ success: true, data: { questions } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(input, init);
  };
}

export default function PreviewBankPage() {
  return (
    <div className="qs-ui min-h-screen bg-[var(--qs-bg)] px-5 py-8">
      <div className="mx-auto max-w-[1180px]">
        <QuestionBankPage />
      </div>
    </div>
  );
}
