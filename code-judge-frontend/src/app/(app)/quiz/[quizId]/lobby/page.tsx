"use client";

import { use, useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Clock, Monitor, ShieldCheck, Wifi } from "lucide-react";
import { getQuizByCode, type QuizBasic } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import StudentQuizShell, { QuizPrimaryButton, QuizStateScreen } from "@/components/quiz/live/StudentQuizShell";

export default function QuizLobbyPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isValidQuizCode(code)) return;
    getQuizByCode(code)
      .then((data) => { if (!cancelled) setQuiz(data); })
      .catch(() => { if (!cancelled) setError("Quiz not found or unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  if (!isValidQuizCode(code)) return <QuizStateScreen icon={<ShieldCheck className="mx-auto h-8 w-8 text-rose-500" />} text="Invalid quiz code." />;
  if (loading) return <QuizStateScreen loading text="Checking quiz access…" />;
  if (error || !quiz) return <QuizStateScreen icon={<ShieldCheck className="mx-auto h-8 w-8 text-rose-500" />} text={error || "Quiz unavailable."} />;

  const checks = [
    { label: "Browser ready", icon: Monitor },
    { label: "Connection active", icon: Wifi },
    { label: "Access verified", icon: ShieldCheck },
    { label: "Attempt protected", icon: CheckCircle2 },
  ];

  return (
    <StudentQuizShell
      eyebrow="Assessment Lobby"
      title={quiz.name}
      subtitle="Verify your setup, then enter the assessment."
      backHref={`/quiz/${code}`}
      backLabel="Back to quiz"
      maxWidth="max-w-2xl"
    >
      <section className="rounded-2xl border border-[#E4E7EC] bg-white p-5 dark:border-[#252D3A] dark:bg-[#151A24] sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B7CFF]/12 text-[#6B5CFF] dark:text-[#8B7CFF]"><BookOpen className="h-6 w-6" /></div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#12B76A]/30 bg-[#12B76A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#039855] dark:border-[#20D889]/25 dark:bg-[#20D889]/10 dark:text-[#20D889]">
              <ShieldCheck className="h-3.5 w-3.5" /> Access verified
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7EC] bg-[#F2F4F7] px-2.5 py-1 text-[11px] font-semibold text-[#475467] dark:border-[#252D3A] dark:bg-[#19202C] dark:text-[#9AA4B5]">
              <Clock className="h-3.5 w-3.5" /> {quiz.duration ? `${quiz.duration} minutes` : "No fixed duration"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {checks.map(({ label, icon: Icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] p-3 dark:border-[#252D3A] dark:bg-[#111722]">
              <Icon className="h-4 w-4 shrink-0 text-[#039855] dark:text-[#20D889]" />
              <span className="text-xs font-medium text-[#101828] dark:text-[#F4F6FA]">{label}</span>
            </div>
          ))}
        </div>

        <QuizPrimaryButton href={`/quiz/${code}/attempt`} className="mt-6 w-full min-h-12">
          Enter assessment
        </QuizPrimaryButton>
      </section>
    </StudentQuizShell>
  );
}
