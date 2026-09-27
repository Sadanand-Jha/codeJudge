"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  Target,
  Award,
  Sparkles,
  Loader2,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { getQuizByCode, getQuizLeaderboard, joinQuiz, startQuizAttempt, type Quiz } from "@/services/quiz";
import { toast } from "@/lib/toast";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { getApiErrorMessage } from "@/lib/apiError";
import { writeQuizAttemptAnswers } from "@/lib/quizAttemptStorage";
import StudentQuizShell from "@/components/quiz/live/StudentQuizShell";
import type { LiveParticipant } from "@/types/liveAssessment";

type Step = "code" | "details";

export default function JoinQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [raw, setRaw] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);
  // Exact avatars of users who already attempted this quiz (attempt table
  // via leaderboard). Undefined/empty → ambient decorative avatars.
  const [attemptUsers, setAttemptUsers] = useState<LiveParticipant[] | undefined>(undefined);

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const code = normalizeQuizCode(raw.replace(/[^a-zA-Z]/g, ""));
  const display = formatQuizCode(code);
  const valid = isValidQuizCode(code);

  const handleLookup = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    setAttemptUsers(undefined);
    try {
      const data = await getQuizByCode(code);
      setQuiz(data as unknown as Quiz);
      setStep("details");
      // Pull the exact users (with their exact avatars) who already
      // attempted this quiz. Falls back to ambient avatars on any failure.
      try {
        const board = await getQuizLeaderboard(String((data as unknown as Quiz).id));
        // One row per attempt → same user repeats. Keep only the first
        // occurrence per user (leaderboard is ranked, so this is their best).
        const seen = new Set<number>();
        const unique = (board ?? []).filter((entry) => {
          if (seen.has(entry.user_id)) return false;
          seen.add(entry.user_id);
          return true;
        });
        const users: LiveParticipant[] = unique.slice(0, 24).map((entry, i, list) => {
          const name =
            [entry.first_name, entry.last_name].filter(Boolean).join(" ") || entry.username;
          return {
            id: `attempt-user-${entry.user_id}`,
            username: name,
            avatar: (name.charAt(0) || "S").toUpperCase(),
            avatarUrl: entry.avatar_url ?? undefined,
            status: "idle",
            progress: 0,
            questionsAnswered: 0,
            totalQuestions: 0,
            currentQuestion: 0,
            timeSpent: 0,
            connection: "good",
            joinedAt: entry.completed_at,
            positionSeed: (i + 1) / (list.length + 1),
          } satisfies LiveParticipant;
        });
        if (users.length > 0) setAttemptUsers(users);
      } catch {
        // Attempt table unavailable — ambient avatars stay.
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Quiz not found. Please check the code and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!quiz || joining) return;
    setJoining(true);
    try {
      await joinQuiz({ code });
      toast.success({ title: "Joined!", description: `You've joined "${quiz.name}"` });
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
        title: "Could not join",
        description: getApiErrorMessage(err, "Something went wrong. Please try again."),
      });
    } finally {
      setJoining(false);
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "Not set";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  };

  const getTimeRemaining = (iso: string | null) => {
    if (!iso) return null;
    if (clockMs === null) return "Soon";
    const diff = new Date(iso).getTime() - clockMs;
    if (diff <= 0) return "Started";
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getQuizStatus = () => {
    if (!quiz) return null;
    const now = clockMs ?? 0;
    const start = quiz.starttime ? new Date(quiz.starttime).getTime() : null;
    const end = quiz.endtime ? new Date(quiz.endtime).getTime() : null;

    if (start && now < start) return { label: "Upcoming", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    if (end && now > end) return { label: "Ended", color: "text-red-500 bg-red-500/10 border-red-500/20" };
    return { label: "Live", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
  };

  const status = getQuizStatus();

  return (
    <StudentQuizShell
      eyebrow="ByteClash"
      title="Join Quiz"
      subtitle="Enter a valid quiz code to verify access."
      backHref="/quiz"
      backLabel="Back"
      maxWidth="max-w-2xl"
      background="sky"
      crowdParticipants={attemptUsers}
      hideHeader
    >
        <AnimatePresence mode="wait">
          {step === "code" ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5 sm:space-y-6"
            >
              <div className="mx-auto w-fit max-w-full rounded-2xl border border-[#E4E7EC]/80 bg-white/85 px-6 py-5 text-center backdrop-blur-md dark:border-[#252D3A]/80 dark:bg-[#151A24]/85">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B7CFF] to-[#6B5CFF] mx-auto">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="mt-3">
                  <h2 className="text-xl font-bold text-[#101828] dark:text-[#F4F6FA]">Enter Quiz Code</h2>
                  <p className="text-sm text-[#475467] dark:text-[#9AA4B5] mt-1">
                    Enter the 16-character code shared by your teacher
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-[#E4E7EC] bg-white p-4 dark:border-[#252D3A] dark:bg-[#151A24] sm:p-6">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">
                  Quiz Code
                </label>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={19}
                  value={display}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="ABCD-EFGH-IJKL-MNOP"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] px-2 py-4 text-center font-mono text-lg font-bold tracking-[0.08em] text-[#101828] placeholder:text-[#98A2B3] focus:border-[#8B7CFF]/60 focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]/15 dark:border-[#252D3A] dark:bg-[#111722] dark:text-[#F4F6FA] dark:placeholder:text-[#687386] sm:px-4 sm:text-2xl sm:tracking-[0.2em]"
                  autoFocus
                />

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                    <p className="text-xs text-red-500">{error}</p>
                  </div>
                )}

                {!valid && code.length > 0 && (
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#687386] text-center">
                    Enter the full 16-letter code ({code.length}/16)
                  </p>
                )}

                <button
                  onClick={handleLookup}
                  disabled={!valid || loading}
                  className="w-full h-11 rounded-xl bg-[#8B7CFF] text-sm font-semibold text-white hover:bg-[#7A6BF5] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Look Up Quiz <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </motion.div>
          ) : quiz ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-[#E4E7EC]/60 bg-white/50 overflow-hidden backdrop-blur-lg dark:border-[#252D3A]/60 dark:bg-[#151A24]/45">
                <div className="bg-gradient-to-r from-[#8B7CFF]/10 to-[#4F9DFF]/10 px-6 py-5 border-b border-[#E4E7EC] dark:border-[#252D3A]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h2 className="break-words text-xl font-bold text-[#101828] dark:text-[#F4F6FA]">{quiz.name}</h2>
                      <p className="text-xs text-[#98A2B3] dark:text-[#687386]">Secure assessment</p>
                    </div>
                    {status && (
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard
                      icon={Clock}
                      label="Duration"
                      value={quiz.duration ? `${quiz.duration} min` : "Not set"}
                      color="#3B82F6"
                    />
                    <InfoCard
                      icon={Target}
                      label="Total Marks"
                      value={quiz.total_marks?.toString() || "—"}
                      color="#A855F7"
                    />
                    <InfoCard
                      icon={Award}
                      label="Passing Marks"
                      value={quiz.passing_marks?.toString() || "—"}
                      color="#22C55E"
                    />
                    <InfoCard
                      icon={BookOpen}
                      label="Difficulty"
                      value={quiz.difficulty?.toString() || "—"}
                      color="#F59E0B"
                    />
                  </div>

                  <div className="rounded-xl border border-[#E4E7EC] bg-[#F7F8FA]/50 p-4 space-y-3 backdrop-blur-sm dark:border-[#252D3A] dark:bg-[#111722]/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">Schedule</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-[#98A2B3] dark:text-[#687386]">
                          <Calendar className="h-3.5 w-3.5" />
                          Starts
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-[#101828] dark:text-[#F4F6FA]">{formatDateTime(quiz.starttime)}</p>
                          {quiz.starttime && (
                            <p className="text-[10px] text-[#98A2B3] dark:text-[#687386]">{getTimeRemaining(quiz.starttime)}</p>
                          )}
                        </div>
                      </div>
                      <div className="h-px bg-[#E4E7EC] dark:bg-[#252D3A]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-[#98A2B3] dark:text-[#687386]">
                          <Calendar className="h-3.5 w-3.5" />
                          Ends
                        </div>
                        <p className="text-xs font-medium text-[#101828] dark:text-[#F4F6FA]">{formatDateTime(quiz.endtime)}</p>
                      </div>
                    </div>
                  </div>

                  <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                    Your entry is verified securely. Quiz content becomes available only after access is approved.
                  </p>
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining || status?.label === "Ended"}
                className="w-full h-12 rounded-xl bg-[#8B7CFF] text-sm font-semibold text-white hover:bg-[#7A6BF5] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status?.label === "Ended" ? (
                  "Quiz Has Ended"
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Join Quiz
                  </>
                )}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
    </StudentQuizShell>
  );
}

function InfoCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-[#F7F8FA]/50 p-3 space-y-1.5 backdrop-blur-sm dark:border-[#252D3A] dark:bg-[#111722]/40">
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">{label}</span>
      </div>
      <p className="text-sm font-bold text-[#101828] dark:text-[#F4F6FA] pl-0.5">{value}</p>
    </div>
  );
}
