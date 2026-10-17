"use client";

import { use, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Monitor, Rocket, ShieldCheck, Sparkles, Wifi } from "lucide-react";
import { getQuizByCode, type QuizBasic } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { useQuizSounds } from "@/hooks/useQuizSounds";
import StudentQuizShell, { QuizPrimaryButton, QuizStateScreen } from "@/components/quiz/live/StudentQuizShell";

export default function QuizLobbyPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playQuizSound } = useQuizSounds();

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
      eyebrow="Launch checklist"
      title={quiz.name}
      subtitle="Your seat is reserved. Complete the final systems check and begin when you are ready."
      backHref={`/quiz/${code}`}
      backLabel="Back to quiz"
      maxWidth="max-w-2xl"
      background="sky"
      crowdSpeed={2}
    >
      <section className="qs-shadow">
      <div className="qs-card overflow-hidden p-5 sm:p-8">
        <div className="text-center">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"><Rocket className="h-7 w-7" /><Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-[var(--qs-sun)]" /></div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--qs-brand)]">All systems ready</p>
          <h2 className="mt-1 text-xl font-extrabold text-[var(--qs-ink)] sm:text-2xl">Ready for your next adventure?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--qs-muted)]">Once you enter, the timer may begin. Keep this tab open and enjoy the challenge.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-2.5 py-1 text-[11px] font-bold text-[var(--qs-ok)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Access verified
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--qs-muted)]">
              <Clock className="h-3.5 w-3.5" /> {quiz.duration ? `${quiz.duration} minutes` : "No fixed duration"}
            </span>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
          {checks.map(({ label, icon: Icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--qs-okbg)] text-[var(--qs-ok)]"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 text-sm font-semibold text-[var(--qs-ink)]">{label}</span>
              <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-[var(--qs-ok)]" />
            </div>
          ))}
        </div>

        {/* QuizPrimaryButton with href ignores onClick, so the wrapper plays the launch sound. */}
        <span className="relative mt-7 block" onClick={() => playQuizSound("submit")}>
          <QuizPrimaryButton href={`/quiz/${code}/attempt`} className="relative w-full min-h-14 rounded-2xl text-base">
            Enter assessment <ArrowRight className="h-4 w-4" />
          </QuizPrimaryButton>
        </span>
        <p className="relative mt-3 text-center text-[11px] text-[var(--qs-muted)]">Secure attempt • answers save automatically</p>
      </div>
      </section>
    </StudentQuizShell>
  );
}
