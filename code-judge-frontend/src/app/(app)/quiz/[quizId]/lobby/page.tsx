"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Loader2, Monitor, ShieldCheck, Wifi } from "lucide-react";
import { getQuizByCode, type QuizBasic } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

export default function QuizLobbyPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isValidQuizCode(code)) {
      setError("Invalid quiz code.");
      setLoading(false);
      return;
    }
    getQuizByCode(code)
      .then((data) => { if (!cancelled) setQuiz(data); })
      .catch(() => { if (!cancelled) setError("Quiz not found or unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  if (loading) return <Screen icon={<Loader2 className="h-7 w-7 animate-spin text-pink-500" />} text="Checking quiz access…" />;
  if (error || !quiz) return <Screen icon={<ShieldCheck className="h-8 w-8 text-rose-500" />} text={error || "Quiz unavailable."} />;

  const checks = [
    { label: "Browser ready", icon: Monitor },
    { label: "Connection active", icon: Wifi },
    { label: "Access verified", icon: ShieldCheck },
    { label: "Attempt protected", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <main className="mx-auto max-w-2xl space-y-4">
        <Link href={`/quiz/${code}`} className="text-xs font-semibold text-text-secondary hover:text-text-primary">← Back to quiz</Link>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500"><BookOpen className="h-6 w-6" /></div>
            <h1 className="mt-4 break-words text-xl font-bold text-text-primary">{quiz.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">Assessment lobby</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {checks.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background p-3">
                <Icon className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-xs font-medium text-text-primary">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-text-secondary">
            <Clock className="h-4 w-4" /> {quiz.duration ? `${quiz.duration} minutes` : "No fixed duration"}
          </div>

          <Link href={`/quiz/${code}/attempt`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pink-600 px-5 text-sm font-bold text-white hover:bg-pink-700">
            Enter assessment
          </Link>
        </section>
      </main>
    </div>
  );
}

function Screen({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex min-h-[70vh] items-center justify-center bg-background px-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">{icon}<p className="mt-3 text-sm text-text-secondary">{text}</p></div></div>;
}
