"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { getQuizByCode, joinQuiz, startQuizAttempt, type Quiz } from "@/services/quiz";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import { writeQuizAttemptAnswers } from "@/lib/quizAttemptStorage";
import StudentQuizShell, { QuizPrimaryButton, QuizStateScreen } from "@/components/quiz/live/StudentQuizShell";

export default function QuizDetailsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isValidQuizCode(code)) return;

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
      const startsAt = quiz.starttime ? new Date(quiz.starttime).getTime() : null;
      const isAvailableNow = !startsAt || startsAt <= Date.now();
      if (isAvailableNow) {
        const started = await startQuizAttempt(String(quiz.id));
        if (!started.resumed) {
          try { writeQuizAttemptAnswers(started.attempt.id, {}); } catch { /* storage unavailable */ }
        }
        router.push(`/quiz/${code}/attempt`);
      } else {
        router.push(`/quiz/${code}/waiting`);
      }
    } catch (err: unknown) {
      toast.error({
        title: "Access denied",
        description: getApiErrorMessage(err, "You cannot join this quiz."),
      });
    } finally {
      setJoining(false);
    }
  };

  if (!isValidQuizCode(code)) {
    return <QuizStateScreen text="This quiz code is invalid." />;
  }

  if (loading) {
    return <QuizStateScreen loading text="Verifying quiz access…" />;
  }

  if (error || !quiz) {
    return (
      <QuizStateScreen
        icon={<LockKeyhole className="mx-auto h-10 w-10 text-[#98A2B3] dark:text-[#687386]" />}
        title="Quiz unavailable"
        text={error ?? "Quiz not found or no longer available."}
        action={
          <QuizPrimaryButton href="/quiz/join">Enter another code</QuizPrimaryButton>
        }
      />
    );
  }

  const now = clockMs ?? 0;
  const start = quiz.starttime ? new Date(quiz.starttime).getTime() : null;
  const end = quiz.endtime ? new Date(quiz.endtime).getTime() : null;
  const ended = Boolean(end && end < now);
  const upcoming = Boolean(start && start > now);

  return (
    <StudentQuizShell
      eyebrow="Verified Assessment"
      title={quiz.name}
      subtitle={formatQuizCode(code)}
      backHref="/quiz/join"
      backLabel="Change code"
      maxWidth="max-w-3xl"
      actions={
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ended ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400" : upcoming ? "border-[#F79009]/30 bg-[#F79009]/10 text-[#B54708] dark:border-[#FFB84D]/25 dark:bg-[#FFB84D]/10 dark:text-[#FFB84D]" : "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#039855] dark:border-[#20D889]/25 dark:bg-[#20D889]/10 dark:text-[#20D889]"}`}>
          {ended ? "Ended" : upcoming ? "Upcoming" : "Live"}
        </span>
      }
    >
        <section className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white dark:border-[#252D3A] dark:bg-[#151A24]">
          <div className="border-b border-[#E4E7EC] bg-gradient-to-r from-[#8B7CFF]/10 to-[#4F9DFF]/10 p-5 dark:border-[#252D3A] sm:p-7">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#12B76A]/30 bg-[#12B76A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#039855] dark:border-[#20D889]/25 dark:bg-[#20D889]/10 dark:text-[#20D889]">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified assessment
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              <Detail icon={Clock} label="Duration" value={quiz.duration ? `${quiz.duration} min` : "Not set"} />
              <Detail icon={Target} label="Total marks" value={quiz.total_marks?.toString() || "—"} />
              <Detail icon={Award} label="Passing marks" value={quiz.passing_marks?.toString() || "—"} />
              <Detail icon={BookOpen} label="Difficulty" value={quiz.difficulty?.toString() || "—"} />
            </div>

            <div className="mt-4 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] p-4 dark:border-[#252D3A] dark:bg-[#111722]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">Schedule</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Schedule label="Starts" value={formatDate(quiz.starttime)} />
                <Schedule label="Ends" value={formatDate(quiz.endtime)} />
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#12B76A]/25 bg-[#12B76A]/[0.06] p-3 text-xs leading-5 text-[#039855] dark:border-[#20D889]/25 dark:text-[#20D889]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Only approved participants can enter. Questions and private configuration remain hidden until the quiz starts.
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={handleJoin}
          disabled={joining || ended}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8B7CFF] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#7A6BF5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : ended ? "Quiz has ended" : upcoming ? "Join waiting room" : "Join quiz"}
        </button>
    </StudentQuizShell>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] p-3 dark:border-[#252D3A] dark:bg-[#111722] sm:p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#8B7CFF]" /> {label}
      </div>
      <p className="mt-2 break-words text-sm font-bold text-[#101828] dark:text-[#F4F6FA]">{value}</p>
    </div>
  );
}

function Schedule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#98A2B3] dark:text-[#687386]" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-[#101828] dark:text-[#F4F6FA]">{value}</p>
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
