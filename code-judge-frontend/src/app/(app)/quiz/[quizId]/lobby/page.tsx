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
      <section className="relative overflow-hidden rounded-[28px] border border-pink-200/80 bg-white/90 p-5 shadow-[0_30px_90px_-52px_rgba(244,114,182,.75)] dark:border-violet-400/20 dark:bg-[#111624]/92 dark:shadow-[0_32px_95px_-48px_rgba(124,92,255,.65)] sm:p-8">
        <div aria-hidden className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />
        <div aria-hidden className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-pink-300/25 blur-3xl dark:bg-violet-500/15" />
        <div className="text-center">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-orange-400 to-amber-300 text-white shadow-[0_16px_35px_-16px_rgba(244,114,182,.9)] dark:from-violet-500 dark:via-indigo-500 dark:to-cyan-500"><Rocket className="h-7 w-7" /><Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-amber-400 dark:text-cyan-300" /></div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-pink-500 dark:text-violet-300">All systems ready</p>
          <h2 className="mt-1 text-xl font-bold text-[#101828] dark:text-white sm:text-2xl">Ready for your next adventure?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085] dark:text-[#9AA4B5]">Once you enter, the timer may begin. Keep this tab open and enjoy the challenge.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#12B76A]/30 bg-[#12B76A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#039855] dark:border-[#20D889]/25 dark:bg-[#20D889]/10 dark:text-[#20D889]">
              <ShieldCheck className="h-3.5 w-3.5" /> Access verified
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7EC] bg-[#F2F4F7] px-2.5 py-1 text-[11px] font-semibold text-[#475467] dark:border-[#252D3A] dark:bg-[#19202C] dark:text-[#9AA4B5]">
              <Clock className="h-3.5 w-3.5" /> {quiz.duration ? `${quiz.duration} minutes` : "No fixed duration"}
            </span>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
          {checks.map(({ label, icon: Icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/70 p-3.5 dark:border-white/[0.07] dark:from-white/[0.045] dark:to-violet-500/[0.045]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 text-sm font-semibold text-[#101828] dark:text-[#F4F6FA]">{label}</span>
              <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
            </div>
          ))}
        </div>

        {/* QuizPrimaryButton with href ignores onClick, so the wrapper plays the launch sound. */}
        <span className="relative mt-7 block" onClick={() => playQuizSound("submit")}>
          <QuizPrimaryButton href={`/quiz/${code}/attempt`} className="relative w-full min-h-14 rounded-2xl text-base">
            Enter assessment <ArrowRight className="h-4 w-4" />
          </QuizPrimaryButton>
        </span>
        <p className="relative mt-3 text-center text-[11px] text-[#98A2B3] dark:text-[#687386]">Secure attempt • answers save automatically</p>
      </section>
    </StudentQuizShell>
  );
}
