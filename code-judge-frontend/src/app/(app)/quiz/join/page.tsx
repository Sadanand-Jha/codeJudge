"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  KeyRound,
  ScanLine,
  Star,
  X,
  Eye,
  Save,
  BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getQuizByCode, getQuizCrowdAvatars, getQuizRating, getCreatorStats, type Quiz, type QuizRatingState, type CreatorPublicStats } from "@/services/quiz";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { getApiErrorMessage } from "@/lib/apiError";
import { useQuizSounds } from "@/hooks/useQuizSounds";
import StudentQuizShell, { QuizLoader, QuizStateScreen } from "@/components/quiz/live/StudentQuizShell";
// DISCONNECTED: import { QuizWarpExperience } from "@/components/quiz/live/QuizWarpExperience";
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
  const router = useRouter();

  // Warp animation disconnected — go straight to the waiting room.
  useEffect(() => {
    if (launchDestination) router.push(launchDestination);
  }, [launchDestination, router]);

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

  // DISCONNECTED (warp animation): const handleLaunchComplete = useCallback(() => {
  //   setLaunchDestination(null);
  //   setJoining(false);
  // }, []);

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

  // Access verification takes over the whole screen with the brand loader
  // instead of a spinner inside the button.
  if (loading) {
    return <QuizStateScreen loading text="Verifying quiz access…" />;
  }

  return (
    <>
    <StudentQuizShell
      eyebrow="QuizSupport"
      title="Join Quiz"
      subtitle="Enter a valid quiz code to verify access."
      backHref="/quiz"
      backLabel="Back"
      maxWidth="max-w-3xl"
      background="sky"
      crowdParticipants={attemptUsers}
      crowdSpeed={2}
      hideHeader
    >
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
              <div className="qs-shadow">
              <div className="qs-card overflow-hidden p-0">
                <div className="relative border-b-2 border-[var(--qs-line)] px-5 pb-5 pt-6 text-center sm:px-8 sm:pb-6 sm:pt-7">
                  <div className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--qs-brand)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-brand)]" /> Step 1 of 2
                  </div>
                  <div className="relative mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                    <KeyRound className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--qs-brand)]">Secure access terminal</p>
                  <h2 className="mt-1.5 text-2xl font-extrabold sm:text-[28px]">Enter your quiz code</h2>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--qs-muted)]">
                    Use the 16-letter access key shared by your teacher to locate and verify the assessment.
                  </p>
                </div>

                <div className="relative space-y-4 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="quiz-access-code" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--qs-muted)]">
                      <ScanLine className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Access key
                    </label>
                    <span className={`text-[10px] font-bold tabular-nums ${valid ? "text-[var(--qs-ok)]" : "text-[var(--qs-muted)]"}`}>
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
                      className={`qs-input h-16 w-full text-center font-mono text-lg font-extrabold sm:h-[72px] sm:px-5 sm:text-[22px] sm:tracking-[0.18em] ${valid ? "border-[var(--qs-ok)]" : ""}`}
                      autoFocus
                    />
                    {valid && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
                        <CheckCircle2 className="h-4 w-4" />
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-1" aria-hidden="true">
                    {Array.from({ length: 16 }, (_, index) => (
                      <span key={index} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${index < code.length ? (valid ? "bg-[var(--qs-ok)]" : "bg-[var(--qs-brand)]") : "bg-[var(--qs-line)]"}`} />
                    ))}
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3.5 py-3">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-bad)]" />
                        <p className="text-xs leading-5 text-[var(--qs-bad)]">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleLookup}
                    disabled={!valid}
                    className="qs-btn h-13 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Verify &amp; continue <ChevronRight className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-center gap-4 pt-0.5 text-[9px] font-semibold text-[var(--qs-muted)]">
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-[var(--qs-ok)]" /> Secure lookup</span>
                    <span className="h-3 w-px bg-[var(--qs-line)]" />
                    <span>No quiz content is revealed yet</span>
                  </div>
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
              className="relative space-y-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:space-y-4"
            >
              <div className="qs-shadow">
              <div className="qs-card overflow-hidden p-0">
                <div className="relative border-b-2 border-[var(--qs-line)] px-5 py-4 sm:px-6 sm:py-5">
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
                          className={`h-4 w-4 ${quizRating?.averageRating != null && star <= Math.round(quizRating.averageRating) ? "fill-amber-400 text-amber-400" : "fill-[var(--qs-line)] text-[var(--qs-muted)]"}`}
                        />
                      ))}
                    </span>
                  </div>
                  {/* Header is just avatar (30%) + quiz name / creator (rest). Stats panel stacks full-width below. */}
                  <div className="flex items-center gap-4">
                    <div className="w-[30%] max-w-28 shrink-0">
                      <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-brand)] text-2xl font-bold uppercase text-[var(--qs-on-brand)] sm:text-4xl">
                        {quiz.creator_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may be remote/user-configured
                          <img src={quiz.creator_avatar_url} alt={`${quiz.creator_name || "Quiz creator"} avatar`} className="h-full w-full object-cover" />
                        ) : quiz.creator_name ? (
                          quiz.creator_name.slice(0, 1)
                        ) : (
                          <Layers3 className="h-8 w-8" />
                        )}
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-ok)]" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-extrabold leading-snug sm:text-2xl sm:leading-tight">{quiz.name}</h2>
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
                    />
                    <InfoCard
                      icon={Target}
                      label="Total Marks"
                      value={quiz.total_marks?.toString() || "—"}
                    />
                  </div>

                  <div className="grid items-stretch gap-3 md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-3">
                    <InfoCard
                      icon={BookOpen}
                      label="Difficulty"
                      value={quiz.difficulty_name || "Not specified"}
                    />
                  <div className="overflow-hidden rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
                    <div className="flex items-center justify-between border-b-2 border-[var(--qs-line)] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--qs-muted)]">Quiz schedule</h3>
                      </div>
                      {quiz.starttime && (
                        <span className="rounded-full border-2 border-[var(--qs-brand)] px-2.5 py-1 text-[10px] font-bold text-[var(--qs-brand)]">
                          {getTimeRemaining(quiz.starttime)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="relative flex items-center gap-3 px-4 py-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--qs-muted)]">Starts</p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-[var(--qs-ink)]">{formatDateTime(quiz.starttime)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-t-2 border-[var(--qs-line)] px-4 py-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--qs-muted)]">Ends</p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-[var(--qs-ink)]">{formatDateTime(quiz.endtime)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>

                  <div className="flex h-full flex-col rounded-2xl border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] p-4">
                    <div className="mb-2.5 flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--qs-ok)] text-[var(--qs-on-brand)]">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--qs-ok)]">
                          Secure entry confirmed <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-[var(--qs-ok)] opacity-80">Quiz content stays protected and becomes available only after your access is approved.</p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col items-stretch gap-1.5 border-t-2 border-[var(--qs-ok)]/20 pt-2.5">
                      {([
                        { icon: ShieldCheck, label: "Access controlled" },
                        { icon: UsersRound, label: "Private session" },
                        // { icon: CheckCircle2, label: "Entry verified" },
                        { icon: BadgeCheck, label: "Verified identity" },
                        // { icon: Lock, label: "Protected content" },
                        { icon: Eye, label: "Fair-play monitoring" },
                        { icon: Save, label: "Auto-saved answers" },
                      ] satisfies Array<{ icon: LucideIcon; label: string }>).map(({ icon: Icon, label }) => (
                        <span key={label} className="inline-flex w-full items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)]/20 bg-[var(--qs-surface)] px-2.5 py-1 text-[9px] font-semibold text-[var(--qs-ok)]">
                          <Icon className="h-3 w-3" /> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
              </div>

              <div className="fixed inset-x-0 bottom-0 z-[70] border-t-2 border-[var(--qs-line)] bg-[var(--background)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.14)] sm:px-6 lg:border-t-0 lg:bg-transparent lg:shadow-none">
                <div className="mx-auto w-full max-w-3xl">
                  <button
                    onClick={handleJoin}
                    disabled={joining || status?.label === "Ended"}
                    className="qs-btn h-14 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {joining ? (
                      <QuizLoader size={16} />
                    ) : status?.label === "Ended" ? (
                      "Quiz Has Ended"
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Join Quiz
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[10px] font-semibold text-[var(--qs-muted)]">
                    {/* REGISTRATION STEP COMMENTED OUT — Registration and access verification happen in the next step. */}
                    Access verification happens in the next step.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
    </StudentQuizShell>
    {/* DISCONNECTED (warp aeroplane animation):
    {launchDestination && (
      <QuizWarpExperience
        code={code}
        quizName={quiz?.name}
        destination={launchDestination}
        duration={5600}
        onComplete={handleLaunchComplete}
      />
    )}
    */}
    </>
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
        className="flex max-w-full flex-col items-start gap-1 rounded-lg px-1 py-0.5 outline-none transition-colors hover:bg-[var(--qs-brand)]/10 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)] sm:flex-row sm:items-center sm:gap-1.5"
      >
        <span className="max-w-full truncate text-sm font-extrabold tracking-tight text-[var(--qs-brand)] sm:text-base">
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
                className={`h-3 w-3 ${teacherAvg != null && star <= Math.round(teacherAvg) ? "fill-amber-400 text-amber-400" : "fill-[var(--qs-line)] text-[var(--qs-muted)]"}`}
              />
            ))}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
          className="relative mt-3 w-full overflow-hidden rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-[0_6px_0_rgba(26,18,64,0.08)]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close teacher stats"
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--qs-muted)] outline-none transition-colors hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
            {loading ? (
              <div className="flex items-center gap-2.5 p-3.5 pr-10">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--qs-brand)]/15" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-[var(--qs-line)]" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-[var(--qs-line)]" />
                </div>
              </div>
            ) : stats ? (
              <div className="p-3.5 pr-10">
                <p className="truncate text-xs font-bold text-[var(--qs-ink)]">
                  {stats.username || creatorName}
                </p>
                {/* Teacher rating strip */}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-[1px]" role="img" aria-label={stats.averageTeacherRating != null ? `Teacher rating ${stats.averageTeacherRating.toFixed(1)} out of 5 from ${stats.teacherRatingCount} ratings` : "Teacher not rated yet"}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${stats.averageTeacherRating != null && star <= Math.round(stats.averageTeacherRating) ? "fill-amber-400 text-amber-400" : "fill-[var(--qs-line)] text-[var(--qs-muted)]"}`}
                      />
                    ))}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {stats.averageTeacherRating != null ? stats.averageTeacherRating.toFixed(1) : "New"}
                  </span>
                  {stats.teacherRatingCount > 0 && (
                    <span className="text-[10px] font-semibold text-[var(--qs-muted)]">
                      · {stats.teacherRatingCount} {stats.teacherRatingCount === 1 ? "rating" : "ratings"}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t-2 border-[var(--qs-line)] pt-2.5">
                  <div className="min-w-0 text-center">
                    <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-[var(--qs-ink)]">
                      <UsersRound className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                      {stats.uniqueStudents}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                      Students
                    </p>
                  </div>
                  <div className="min-w-0 border-x-2 border-[var(--qs-line)] px-1 text-center">
                    <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-[var(--qs-ink)]">
                      <BookOpen className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                      {stats.quizzesCreated}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                      Quizzes
                    </p>
                  </div>
                  <div className="min-w-0 text-center">
                    <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-[var(--qs-ink)]">
                      <Zap className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                      {stats.totalAttempts}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                      Attempts
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="p-3.5 pr-10 text-[11px] font-semibold text-[var(--qs-muted)]">
                Could not load teacher stats right now.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(26,18,64,0.12)] sm:p-4">
      <div className="relative flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] transition-transform duration-200 group-hover:scale-105"
        >
          <Icon className="h-4 w-4 text-[var(--qs-brand)]" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--qs-muted)] sm:text-[10px]">{label}</span>
      </div>
      <p className="relative mt-2 text-base font-bold tracking-tight text-[var(--qs-ink)]">{value}</p>
    </div>
  );
}
