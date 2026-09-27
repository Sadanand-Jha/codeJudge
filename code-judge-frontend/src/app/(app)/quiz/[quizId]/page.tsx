"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Target,
} from "lucide-react";
import { getQuizByCode, joinQuiz, type Quiz } from "@/services/quiz";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { toast } from "@/lib/toast";

export default function QuizDetailsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isValidQuizCode(code)) {
      setError("This quiz code is invalid.");
      setLoading(false);
      return;
    }

    getQuizByCode(code)
      .then((data) => {
        if (!cancelled) setQuiz(data as unknown as Quiz);
      })
      .catch(() => {
        if (!cancelled) setError("Quiz not found or no longer available.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleJoin = async () => {
    if (!quiz || joining) return;
    setJoining(true);
    try {
      await joinQuiz({ code });
      router.push(`/quiz/${code}/waiting`);
    } catch (err: any) {
      toast.error({
        title: "Access denied",
        description: err?.response?.data?.message || "You cannot join this quiz.",
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-pink-500" />
          <p className="mt-3 text-sm text-text-secondary">Verifying quiz access…</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
          <LockKeyhole className="mx-auto h-10 w-10 text-text-muted" />
          <h1 className="mt-4 text-xl font-bold text-text-primary">Quiz unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{error}</p>
          <Link href="/quiz/join" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-pink-600 px-5 text-sm font-semibold text-white hover:bg-pink-700">
            Enter another code
          </Link>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const start = quiz.starttime ? new Date(quiz.starttime).getTime() : null;
  const end = quiz.endtime ? new Date(quiz.endtime).getTime() : null;
  const ended = Boolean(end && end < now);
  const upcoming = Boolean(start && start > now);

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-8">
      <main className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <Link href="/quiz/join" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-secondary hover:bg-card-hover hover:text-text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Change code
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-gradient-to-br from-pink-500/[0.08] to-violet-500/[0.05] p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified assessment
                </div>
                <h1 className="break-words text-xl font-bold tracking-tight text-text-primary sm:text-2xl">{quiz.name}</h1>
                <p className="mt-2 font-mono text-xs text-text-muted">{formatQuizCode(code)}</p>
              </div>
              <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ended ? "border-rose-500/20 bg-rose-500/10 text-rose-600" : upcoming ? "border-amber-500/20 bg-amber-500/10 text-amber-600" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"}`}>
                {ended ? "Ended" : upcoming ? "Upcoming" : "Live"}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              <Detail icon={Clock} label="Duration" value={quiz.duration ? `${quiz.duration} min` : "Not set"} />
              <Detail icon={Target} label="Total marks" value={quiz.total_marks?.toString() || "—"} />
              <Detail icon={Award} label="Passing marks" value={quiz.passing_marks?.toString() || "—"} />
              <Detail icon={BookOpen} label="Difficulty" value={quiz.difficulty?.toString() || "—"} />
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Schedule</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Schedule label="Starts" value={formatDate(quiz.starttime)} />
                <Schedule label="Ends" value={formatDate(quiz.endtime)} />
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs leading-5 text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Only approved participants can enter. Questions and private configuration remain hidden until the quiz starts.
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={handleJoin}
          disabled={joining || ended}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-700 px-5 text-sm font-bold text-white shadow-lg shadow-pink-500/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : ended ? "Quiz has ended" : upcoming ? "Join waiting room" : "Join quiz"}
        </button>
      </main>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        <Icon className="h-3.5 w-3.5 shrink-0 text-pink-500" /> {label}
      </div>
      <p className="mt-2 break-words text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}

function Schedule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}
