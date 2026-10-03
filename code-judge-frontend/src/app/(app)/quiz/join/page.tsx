"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  Target,
  Sparkles,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  Layers3,
  UsersRound,
  Zap,
  Rocket,
  KeyRound,
  ScanLine,
  Star,
  X,
  Lock,
  Eye,
  Save,
  BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getQuizByCode, getQuizCrowdAvatars, getQuizRating, getCreatorStats, type Quiz, type QuizRatingState, type CreatorPublicStats } from "@/services/quiz";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { getApiErrorMessage } from "@/lib/apiError";
import { useQuizSounds } from "@/hooks/useQuizSounds";
import StudentQuizShell, { QuizLoader } from "@/components/quiz/live/StudentQuizShell";
import { QuizWarpExperience } from "@/components/quiz/live/QuizWarpExperience";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { LiveParticipant } from "@/types/liveAssessment";

type Step = "code" | "details";

export default function JoinQuizPage() {
  const [step, setStep] = useState<Step>("code");
  const [raw, setRaw] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [launchDestination, setLaunchDestination] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);
  // Exact avatars of users who already attempted this quiz (attempt table
  // via leaderboard). Undefined/empty → ambient decorative avatars.
  const [attemptUsers, setAttemptUsers] = useState<LiveParticipant[] | undefined>(undefined);
  const [quizRating, setQuizRating] = useState<QuizRatingState | null>(null);
  const [creatorStats, setCreatorStats] = useState<CreatorPublicStats | null>(null);
  const [creatorStatsLoading, setCreatorStatsLoading] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const creatorTimerRef = useRef<number | null>(null);
  const lookupInFlightRef = useRef(false);
  const initialCodeHandledRef = useRef(false);
  const isMobile = useIsMobile();
  const { playQuizSound } = useQuizSounds();

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Teacher stats auto-hide: visible for 2s after tap, then removed.
  useEffect(() => {
    return () => {
      if (creatorTimerRef.current !== null) window.clearTimeout(creatorTimerRef.current);
    };
  }, []);

  const handleCreatorToggle = useCallback(() => {
    playQuizSound("select");
    if (creatorTimerRef.current !== null) {
      window.clearTimeout(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    // Chevron acts as both open + close: tap again to dismiss early.
    if (creatorOpen) {
      setCreatorOpen(false);
      return;
    }
    setCreatorOpen(true);
    creatorTimerRef.current = window.setTimeout(() => {
      setCreatorOpen(false);
      creatorTimerRef.current = null;
    }, 2000);
  }, [playQuizSound, creatorOpen]);

  const handleCreatorClose = useCallback(() => {
    playQuizSound("select");
    if (creatorTimerRef.current !== null) {
      window.clearTimeout(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    setCreatorOpen(false);
  }, [playQuizSound]);

  const code = normalizeQuizCode(raw.replace(/[^a-zA-Z]/g, ""));
  const display = formatQuizCode(code);
  const valid = isValidQuizCode(code);

  const lookupQuiz = useCallback(async (requestedCode: string) => {
    if (!isValidQuizCode(requestedCode) || lookupInFlightRef.current) return;
    lookupInFlightRef.current = true;
    setLoading(true);
    setError(null);
    setAttemptUsers(undefined);
    setQuizRating(null);
    setCreatorStats(null);
    setCreatorStatsLoading(false);
    setCreatorOpen(false);
    if (creatorTimerRef.current !== null) {
      window.clearTimeout(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    try {
      const data = await getQuizByCode(requestedCode);
      setQuiz(data as unknown as Quiz);
      setStep("details");
      playQuizSound("success");
      // Rating is aggregate-only here; individual learner ratings and
      // identities never leave the review/feedback workflow.
      getQuizRating(String(data.id))
        .then(setQuizRating)
        .catch(() => setQuizRating(null));
      // Creator card is aggregate-only too (no email / personal info).
      const creatorId = (data as unknown as Quiz).createdby;
      if (Number.isInteger(creatorId)) {
        setCreatorStatsLoading(true);
        getCreatorStats(String(creatorId))
          .then(setCreatorStats)
          .catch(() => setCreatorStats(null))
          .finally(() => setCreatorStatsLoading(false));
      }
      // Crowd background shows every participant's avatar (avatar-only API —
      // no ranks, scores, or names). Falls back to ambient avatars on failure.
      try {
        const crowd = await getQuizCrowdAvatars(String((data as unknown as Quiz).id));
        const users: LiveParticipant[] = (crowd ?? []).map((entry, i, list) => {
          return {
            id: `quiz-crowd-${i}`,
            username: `Participant ${i + 1}`,
            avatar: "S",
            avatarUrl: entry.avatarUrl ?? undefined,
            status: entry.status,
            progress: 0,
            questionsAnswered: 0,
            totalQuestions: 0,
            currentQuestion: 0,
            timeSpent: 0,
            connection: "good",
            joinedAt: new Date().toISOString(),
            positionSeed: (i + 1) / (list.length + 1),
          } satisfies LiveParticipant;
        });
        if (users.length > 0) setAttemptUsers(users);
      } catch {
        // Attempt table unavailable — ambient avatars stay.
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Quiz not found. Please check the code and try again."));
      playQuizSound("error");
    } finally {
      lookupInFlightRef.current = false;
      setLoading(false);
    }
  }, [playQuizSound]);

  const handleLookup = () => {
    playQuizSound("navigate");
    void lookupQuiz(code);
  };

  useEffect(() => {
    if (initialCodeHandledRef.current) return;

    const requestedCode = normalizeQuizCode(
      new URLSearchParams(window.location.search).get("code")?.replace(/[^a-zA-Z]/g, "") ?? ""
    );
    if (!isValidQuizCode(requestedCode)) return;

    const timer = window.setTimeout(() => {
      if (initialCodeHandledRef.current) return;
      initialCodeHandledRef.current = true;
      setRaw(requestedCode);
      void lookupQuiz(requestedCode);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [lookupQuiz]);

  const handleJoin = () => {
    if (!quiz || joining) return;
    setJoining(true);
    playQuizSound("submit");
    // Registration is disabled for students. Joining goes straight to the
    // waiting room; the server still enforces quiz availability and audience.
    setLaunchDestination(`/quiz/${code}/waiting`);
  };

  const handleLaunchComplete = useCallback(() => {
    setLaunchDestination(null);
    setJoining(false);
  }, []);

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
    <>
    <StudentQuizShell
      eyebrow="ByteClash"
      title="Join Quiz"
      subtitle="Enter a valid quiz code to verify access."
      backHref="/quiz"
      backLabel="Back"
      maxWidth="max-w-3xl"
      background="sky"
      crowdParticipants={attemptUsers}
      crowdSpeed={2}
      hideHeader
      fitViewport
    >
        <JoinPageBackdrop />
        <AnimatePresence mode="wait">
          {step === "code" ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: isMobile ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isMobile ? 0 : -12 }}
              transition={isMobile ? { duration: 0.15 } : undefined}
              className="mx-auto w-full max-w-xl"
            >
              <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 shadow-[0_28px_90px_-34px_rgba(64,44,155,.6)] backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#111526]/82 dark:shadow-[0_32px_100px_-30px_rgba(5,3,25,.95)]">
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
                  <div className="absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
                  <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]" style={{ backgroundImage: "linear-gradient(rgba(139,124,255,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(139,124,255,.75) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                </div>

                <div className="relative border-b border-[#E4E7EC]/70 px-5 pb-5 pt-6 text-center dark:border-white/[0.07] sm:px-8 sm:pb-6 sm:pt-7">
                  <div className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-violet-500/15 bg-violet-500/[0.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Step 1 of 2
                  </div>
                  <div className="relative mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-pink-300/40 bg-gradient-to-br from-pink-400 via-orange-400 to-amber-300 text-white shadow-[0_14px_34px_-12px_rgba(244,114,182,.8)] dark:border-violet-300/25 dark:from-[#8B7CFF] dark:via-[#7562EB] dark:to-[#5B4CE2] dark:shadow-[0_14px_34px_-12px_rgba(124,92,255,.95)]">
                    <KeyRound className="h-7 w-7" />
                    {/* Infinite pulse ring skipped on mobile — one less permanent loop. */}
                    {!isMobile && <motion.span className="absolute -inset-2 rounded-[22px] border border-violet-400/20" animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }} />}
                  </div>
                  <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Secure access terminal</p>
                  <h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.03em] text-[#101828] dark:text-white sm:text-[28px]">Enter your quiz code</h2>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#667085] dark:text-[#98A2B3]">
                    Use the 16-letter access key shared by your teacher to locate and verify the assessment.
                  </p>
                </div>

                <div className="relative space-y-4 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="quiz-access-code" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#667085] dark:text-[#8F9AAF]">
                      <ScanLine className="h-3.5 w-3.5 text-violet-500" /> Access key
                    </label>
                    <span className={`text-[10px] font-bold tabular-nums ${valid ? "text-emerald-600 dark:text-emerald-300" : "text-[#98A2B3] dark:text-[#687386]"}`}>
                      {valid ? "Ready" : `${code.length} / 16`}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="quiz-access-code"
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
                      className={`h-16 w-full rounded-2xl border bg-[#F8F9FC]/80 px-3 text-center font-mono text-lg font-extrabold tracking-[0.11em] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3]/70 dark:bg-[#090E19]/75 dark:text-white dark:placeholder:text-[#5E697D] sm:h-[72px] sm:px-5 sm:text-[22px] sm:tracking-[0.18em] ${valid ? "border-emerald-500/40 shadow-[0_0_0_3px_rgba(16,185,129,.08),0_12px_32px_-24px_rgba(16,185,129,.8)]" : "border-[#DDE2EA] focus:border-violet-500/55 focus:shadow-[0_0_0_4px_rgba(139,124,255,.1),0_16px_36px_-28px_rgba(124,92,255,.9)] dark:border-white/[0.09]"}`}
                      autoFocus
                    />
                    {valid && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" />
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-1" aria-hidden="true">
                    {Array.from({ length: 16 }, (_, index) => (
                      <span key={index} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${index < code.length ? (valid ? "bg-emerald-500" : "bg-violet-500") : "bg-[#E4E7EC] dark:bg-white/[0.08]"}`} />
                    ))}
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        <p className="text-xs leading-5 text-red-600 dark:text-red-300">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleLookup}
                    disabled={!valid || loading}
                    className="group relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-4 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(244,114,182,.85)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(244,114,182,.95)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-[#E4E7EC] disabled:via-[#E4E7EC] disabled:to-[#E4E7EC] disabled:text-[#98A2B3] disabled:shadow-none dark:from-[#725EF0] dark:via-[#8B7CFF] dark:to-[#9A69FF] dark:shadow-[0_14px_30px_-16px_rgba(124,92,255,.9)] dark:hover:shadow-[0_18px_36px_-14px_rgba(124,92,255,1)] dark:disabled:from-white/[0.08] dark:disabled:via-white/[0.08] dark:disabled:to-white/[0.08] dark:disabled:text-[#687386]"
                  >
                    <span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/20 blur-sm transition-transform duration-700 group-hover:translate-x-[450%]" />
                    {loading ? (
                      <><QuizLoader className="h-4 w-4 text-white" /> Verifying access…</>
                    ) : (
                      <>Verify &amp; continue <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-4 pt-0.5 text-[9px] font-semibold text-[#98A2B3] dark:text-[#687386]">
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Secure lookup</span>
                    <span className="h-3 w-px bg-[#E4E7EC] dark:bg-white/10" />
                    <span>No quiz content is revealed yet</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : quiz ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: isMobile ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isMobile ? 0 : -12 }}
              transition={isMobile ? { duration: 0.15 } : undefined}
              className="has-mobile-viewport-actions relative space-y-3 sm:space-y-4"
            >
              <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 shadow-[0_24px_80px_-28px_rgba(60,46,140,0.45)] backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#111526]/80 dark:shadow-[0_28px_90px_-24px_rgba(7,5,30,0.9)]">
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
                  <div className="absolute -left-28 top-32 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
                  <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.055]" style={{ backgroundImage: "linear-gradient(rgba(124,108,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(124,108,255,.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                </div>

                <div className="relative border-b border-[#E4E7EC]/70 bg-gradient-to-br from-violet-500/[0.13] via-transparent to-cyan-400/[0.08] px-5 py-4 dark:border-white/[0.07] sm:px-6 sm:py-5">
                  {/* Rating sits at the very top — stars only, no counts or labels. Always visible, even before the first rating. */}
                  <div className="mb-3 flex justify-center">
                    <span
                      className="inline-flex items-center gap-0.5"
                      role="img"
                      aria-label={quizRating?.averageRating != null ? `Rated ${quizRating.averageRating.toFixed(1)} out of 5` : "No ratings yet"}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${quizRating?.averageRating != null && star <= Math.round(quizRating.averageRating) ? "fill-amber-400 text-amber-400" : "fill-amber-200/80 text-amber-500/70 dark:fill-white/[0.08] dark:text-white/25"}`}
                        />
                      ))}
                    </span>
                  </div>
                  {/* Header is just avatar (30%) + quiz name / creator (rest). Stats panel stacks full-width below. */}
                  <div className="flex items-center gap-4">
                    <div className="w-[30%] max-w-28 shrink-0">
                      <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-full border-2 border-white/80 bg-gradient-to-br from-[#8B7CFF] to-[#5B4CE2] text-2xl font-bold uppercase text-white shadow-[0_12px_32px_-10px_rgba(124,92,255,.95)] dark:border-violet-300/20 sm:text-4xl">
                        {quiz.creator_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may be remote/user-configured
                          <img src={quiz.creator_avatar_url} alt={`${quiz.creator_name || "Quiz creator"} avatar`} className="h-full w-full object-cover" />
                        ) : quiz.creator_name ? (
                          quiz.creator_name.slice(0, 1)
                        ) : (
                          <Layers3 className="h-8 w-8" />
                        )}
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#171a2c]" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-bold leading-snug tracking-[-0.02em] text-[#101828] dark:text-white sm:text-2xl sm:leading-tight">{quiz.name}</h2>
                      {quiz.creator_name && (
                        <CreatorToggle
                          creatorName={quiz.creator_name}
                          teacherAvg={creatorStats?.averageTeacherRating ?? quizRating?.averageTeacherRating ?? null}
                          open={creatorOpen}
                          onToggle={handleCreatorToggle}
                        />
                      )}
                    </div>
                  </div>
                  {quiz.creator_name && (
                    <CreatorStatsPanel
                      creatorName={quiz.creator_name}
                      open={creatorOpen}
                      isMobile={isMobile}
                      loading={creatorStatsLoading}
                      stats={creatorStats}
                      onClose={handleCreatorClose}
                    />
                  )}
                </div>

                <div className="relative space-y-3 p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
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
                  </div>

                  <div className="grid items-stretch gap-3 md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-3">
                    <InfoCard
                      icon={BookOpen}
                      label="Difficulty"
                      value={quiz.difficulty_name || "Not specified"}
                      color="#F59E0B"
                    />
                  <div className="overflow-hidden rounded-2xl border border-[#E4E7EC]/80 bg-white/55 backdrop-blur-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
                    <div className="flex items-center justify-between border-b border-[#E4E7EC]/70 px-4 py-3 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-violet-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#667085] dark:text-[#8F9AAF]">Quiz schedule</h3>
                      </div>
                      {quiz.starttime && (
                        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                          {getTimeRemaining(quiz.starttime)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="relative flex items-center gap-3 px-4 py-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/10 text-blue-500">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">Starts</p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-[#101828] dark:text-[#F4F6FA]">{formatDateTime(quiz.starttime)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-t border-[#E4E7EC]/70 px-4 py-3.5 dark:border-white/[0.06]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-500/15 bg-fuchsia-500/10 text-fuchsia-500">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] dark:text-[#687386]">Ends</p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-[#101828] dark:text-[#F4F6FA]">{formatDateTime(quiz.endtime)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>

                  <div className="flex h-full flex-col rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.09] to-cyan-500/[0.05] p-4">
                    <div className="mb-2.5 flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          Secure entry confirmed <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-emerald-700/80 dark:text-emerald-300/70">Quiz content stays protected and becomes available only after your access is approved.</p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col items-stretch gap-1.5 border-t border-emerald-500/10 pt-2.5">
                      {([
                        { icon: ShieldCheck, label: "Access controlled" },
                        { icon: UsersRound, label: "Private session" },
                        // { icon: CheckCircle2, label: "Entry verified" },
                        { icon: BadgeCheck, label: "Verified identity" },
                        // { icon: Lock, label: "Protected content" },
                        { icon: Eye, label: "Fair-play monitoring" },
                        { icon: Save, label: "Auto-saved answers" },
                      ] satisfies Array<{ icon: LucideIcon; label: string }>).map(({ icon: Icon, label }) => (
                        <span key={label} className="inline-flex w-full items-center gap-1.5 rounded-full border border-emerald-500/10 bg-white/45 px-2.5 py-1 text-[9px] font-semibold text-emerald-800 dark:bg-black/10 dark:text-emerald-200">
                          <Icon className="h-3 w-3" /> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              <div className="mobile-viewport-actions border-t border-[#E4E7EC] px-4 py-3 dark:border-[#252D3A] sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                <button
                  onClick={handleJoin}
                  disabled={joining || status?.label === "Ended"}
                  className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-4 text-sm font-bold text-white shadow-[0_16px_36px_-16px_rgba(244,114,182,.85)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-14px_rgba(244,114,182,.95)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 dark:from-[#7765F5] dark:via-[#8B7CFF] dark:to-[#9A6BFF] dark:shadow-[0_16px_36px_-16px_rgba(124,92,255,.9)] dark:hover:shadow-[0_20px_42px_-14px_rgba(124,92,255,1)]"
                >
                  <span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/20 blur-sm transition-transform duration-700 group-hover:translate-x-[450%]" />
                  {joining ? (
                    <QuizLoader className="h-4 w-4 text-white" />
                  ) : status?.label === "Ended" ? (
                    "Quiz Has Ended"
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Join Quiz
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[10px] font-semibold text-[#667085] dark:text-[#8F9AAF]">
                  {/* REGISTRATION STEP COMMENTED OUT — Registration and access verification happen in the next step. */}
                  Access verification happens in the next step.
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
    </StudentQuizShell>
    {launchDestination && (
      <QuizWarpExperience
        code={code}
        quizName={quiz?.name}
        destination={launchDestination}
        duration={5600}
        onComplete={handleLaunchComplete}
      />
    )}
    </>
  );
}

function JoinPageBackdrop() {
  const isMobile = useIsMobile();
  // Mobile: three static dots. The desktop backdrop runs five permanent
  // orbital/bobbing loops plus blurred orbs behind the code-entry form.
  if (isMobile) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <div className="absolute left-[20%] top-[14%] h-1 w-1 rounded-full bg-white/50" />
        <div className="absolute right-[23%] top-[30%] h-1.5 w-1.5 rounded-full bg-violet-300/50" />
        <div className="absolute bottom-[21%] left-[29%] h-1 w-1 rounded-full bg-cyan-200/50" />
      </div>
    );
  }
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {/* Dark-mode space details: intentionally soft so the quiz remains the focus. */}
      <div className="absolute inset-0 hidden dark:block">
        <div className="absolute left-1/2 top-[48%] h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/[0.055]" />
        <div className="absolute left-1/2 top-[48%] h-[38rem] w-[68rem] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-[50%] border border-cyan-200/[0.045]" />

        <div
          className="absolute right-[7%] top-[10%] hidden h-24 w-24 rounded-full bg-gradient-to-br from-violet-300 via-violet-600 to-[#291462] shadow-[inset_-14px_-12px_24px_rgba(13,7,35,.55),0_0_65px_rgba(124,58,237,.24)] lg:block"
        >
          <span className="absolute left-[18%] top-[24%] h-3 w-3 rounded-full bg-white/10" />
          <span className="absolute bottom-[20%] right-[18%] h-5 w-5 rounded-full border border-white/[0.08] bg-black/10" />
          <span className="absolute left-1/2 top-1/2 h-[145%] w-[190%] -translate-x-1/2 -translate-y-1/2 rotate-[-16deg] rounded-[50%] border-[3px] border-violet-200/15 border-l-violet-200/45" />
        </div>

        <div
          className="absolute left-[8%] top-[24%] hidden h-9 w-9 items-center justify-center rounded-full border border-cyan-200/10 bg-[#0b1530]/60 text-cyan-100/45 shadow-[0_0_28px_rgba(34,211,238,.12)] backdrop-blur-md lg:flex"
        >
          <Rocket className="h-4 w-4 rotate-45" />
        </div>

        <div className="absolute left-[9%] top-[13%] h-px w-28 rotate-[24deg] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute left-[10%] top-[14%] h-1.5 w-1.5 rounded-full bg-cyan-100/60 shadow-[0_0_12px_rgba(165,243,252,.65)]" />
        <div className="absolute left-[16%] top-[18%] h-1 w-1 rounded-full bg-white/60 shadow-[0_0_9px_rgba(255,255,255,.5)]" />
        <div className="absolute right-[18%] bottom-[14%] h-1.5 w-1.5 rounded-full bg-violet-200/60 shadow-[0_0_12px_rgba(196,181,253,.55)]" />
      </div>

      <div className="absolute left-[8%] top-[18%] hidden h-24 w-24 rounded-[28px] border border-violet-300/10 bg-violet-400/[0.04] shadow-[inset_0_0_30px_rgba(139,124,255,.08)] backdrop-blur-sm lg:block rotate-12" />
      <div className="absolute right-[9%] top-[17%] hidden h-16 w-16 rounded-full border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/20 shadow-[0_0_50px_rgba(168,85,247,.18)] lg:block" />
      <div className="absolute bottom-[12%] left-[12%] hidden h-14 w-14 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.04] backdrop-blur-sm lg:block -rotate-12" />

      <div
        className="absolute left-[14%] top-[32%] hidden items-center gap-2 rounded-full border border-pink-200/70 bg-white/70 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-pink-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.045] dark:text-white/35 dark:shadow-none xl:flex"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300/60" /> Secure session
      </div>
      <div
        className="absolute bottom-[19%] right-[12%] hidden items-center gap-2 rounded-full border border-cyan-200/70 bg-white/70 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.045] dark:text-white/35 dark:shadow-none xl:flex"
      >
        <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300/60" /> Ready to launch
      </div>

      <div className="absolute left-[20%] top-[14%] h-1 w-1 rounded-full bg-white/50 shadow-[0_0_12px_3px_rgba(255,255,255,.18)]" />
      <div className="absolute right-[23%] top-[30%] h-1.5 w-1.5 rounded-full bg-violet-300/50 shadow-[0_0_15px_4px_rgba(167,139,250,.2)]" />
      <div className="absolute bottom-[21%] left-[29%] h-1 w-1 rounded-full bg-cyan-200/50 shadow-[0_0_12px_3px_rgba(165,243,252,.16)]" />
    </div>
  );
}

function CreatorToggle({
  creatorName,
  teacherAvg,
  open,
  onToggle,
}: {
  creatorName: string;
  teacherAvg: number | null;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-1.5 min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`About ${creatorName}`}
        className="flex max-w-full flex-col items-start gap-1 rounded-lg px-1 py-0.5 outline-none transition-colors hover:bg-violet-500/[0.07] focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-white/[0.05] sm:flex-row sm:items-center sm:gap-1.5"
      >
        <span className="max-w-full truncate text-sm font-extrabold tracking-tight text-violet-600 dark:text-violet-300 sm:text-base">
          {creatorName}
        </span>
        {/* Teacher rating + chevron on its own line on mobile, inline on sm+. */}
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex shrink-0 items-center gap-[1px]"
            role="img"
            aria-label={teacherAvg != null ? `Teacher rating ${teacherAvg.toFixed(1)} out of 5` : "Teacher not rated yet"}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3 w-3 ${teacherAvg != null && star <= Math.round(teacherAvg) ? "fill-amber-400 text-amber-400" : "fill-amber-200/70 text-amber-500/60 dark:fill-white/[0.08] dark:text-white/25"}`}
              />
            ))}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-violet-500 transition-transform duration-200 dark:text-violet-300 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
    </div>
  );
}

function CreatorStatsPanel({
  creatorName,
  open,
  isMobile,
  loading,
  stats,
  onClose,
}: {
  creatorName: string;
  open: boolean;
  isMobile: boolean;
  loading: boolean;
  stats: CreatorPublicStats | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: isMobile ? 0 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: isMobile ? 0 : -6 }}
          transition={{ duration: isMobile ? 0.15 : 0.2 }}
          className="relative mt-3 w-full overflow-hidden rounded-2xl border border-violet-500/15 bg-white/70 shadow-[0_16px_40px_-24px_rgba(124,92,255,.7)] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0D1322]/90"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close teacher stats"
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[#98A2B3] outline-none transition-colors hover:bg-violet-500/[0.08] hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-violet-400 dark:text-[#687386] dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
            {loading ? (
              <div className="flex items-center gap-2.5 p-3.5 pr-10">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-violet-500/15" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-[#E4E7EC] dark:bg-white/10" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-[#E4E7EC] dark:bg-white/10" />
                </div>
              </div>
            ) : stats ? (
              <div className="p-3.5 pr-10">
                <p className="truncate text-xs font-bold text-[#101828] dark:text-white">
                  {stats.username || creatorName}
                </p>
                {/* Teacher rating strip */}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-[1px]" role="img" aria-label={stats.averageTeacherRating != null ? `Teacher rating ${stats.averageTeacherRating.toFixed(1)} out of 5 from ${stats.teacherRatingCount} ratings` : "Teacher not rated yet"}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${stats.averageTeacherRating != null && star <= Math.round(stats.averageTeacherRating) ? "fill-amber-400 text-amber-400" : "fill-amber-200/70 text-amber-500/60 dark:fill-white/[0.08] dark:text-white/25"}`}
                      />
                    ))}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {stats.averageTeacherRating != null ? stats.averageTeacherRating.toFixed(1) : "New"}
                  </span>
                  {stats.teacherRatingCount > 0 && (
                    <span className="text-[10px] font-semibold text-[#98A2B3] dark:text-[#687386]">
                      · {stats.teacherRatingCount} {stats.teacherRatingCount === 1 ? "rating" : "ratings"}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-[#E4E7EC]/70 pt-2.5 dark:border-white/[0.07]">
                  <div className="min-w-0 text-center">
                    <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-[#101828] dark:text-white">
                      <UsersRound className="h-3.5 w-3.5 text-violet-500" />
                      {stats.uniqueStudents}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#98A2B3] dark:text-[#687386]">
                      Students
                    </p>
                  </div>
                  <div className="min-w-0 border-x border-[#E4E7EC]/70 px-1 text-center dark:border-white/[0.07]">
                    <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-[#101828] dark:text-white">
                      <BookOpen className="h-3.5 w-3.5 text-violet-500" />
                      {stats.quizzesCreated}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#98A2B3] dark:text-[#687386]">
                      Quizzes
                    </p>
                  </div>
                  <div className="min-w-0 text-center">
                    <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-[#101828] dark:text-white">
                      <Zap className="h-3.5 w-3.5 text-violet-500" />
                      {stats.totalAttempts}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#98A2B3] dark:text-[#687386]">
                      Attempts
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="p-3.5 pr-10 text-[11px] font-semibold text-[#667085] dark:text-[#8F9AAF]">
                Could not load teacher stats right now.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
  );
}

function InfoCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#E4E7EC]/80 bg-white/60 p-3.5 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/25 hover:shadow-[0_12px_28px_-20px_rgba(124,92,255,.8)] dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-4">
      <div className="absolute -right-5 -top-6 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-30" style={{ backgroundColor: color }} />
      <div className="relative flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#98A2B3] dark:text-[#687386] sm:text-[10px]">{label}</span>
      </div>
      <p className="relative mt-2 text-base font-bold tracking-tight text-[#101828] dark:text-[#F4F6FA]">{value}</p>
    </div>
  );
}
