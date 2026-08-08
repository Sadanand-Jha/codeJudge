"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Globe,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  Mail,
  Save,
  School,
  Square,
  Users,
  Check,
  X,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { QuizDetails, DEFAULT_QUIZ_DETAILS, VISIBILITY_OPTIONS, QuizVisibility } from "./types";
import { saveQuizDetails, clearQuizState } from "@/utils/quizStorage";
import { getAllSubjects, getQuizVisibilityOptions, createQuiz, updateQuizStatus, getTimezones } from "@/services/quiz";
import { generateQuizCode } from "@/utils/quizCode";
import { SearchableDropdown } from "@/components/ui";
import { SettingsCard, SettingsInput, Toggle, SettingsRow, SettingsSelect } from "@/components/ui/settings";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { useAICreditsStore } from "@/store/aiCreditsStore";

interface QuizSettingsPageProps {
  initialDetails?: QuizDetails;
  onContinue: (details: QuizDetails) => void;
  quizId?: string | number;
  quizStatus?: string | null;
  quizStartTime?: string | null;
  quizEndTime?: string | null;
}

/* =============================================
   Navigation Sections + Accent tones
   ============================================= */
const SECTIONS = [
  { id: "info", label: "Quiz Info", icon: BookOpen, tone: "pink" },
  { id: "registration", label: "Registration", icon: Users, tone: "violet" },
  { id: "responses", label: "Responses", icon: BarChart3, tone: "blue" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const SECTION_ICON_TONES: Record<SectionId, string> = {
  info: "bg-pink-500/10 text-pink-500",
  registration: "bg-violet-500/10 text-violet-500",
  responses: "bg-blue-500/10 text-blue-500",
};

/* =============================================
   Plan student limits
   ============================================= */
const PLAN_STUDENT_LIMITS: Record<string, { label: string; limit: number }> = {
  free: { label: "Free", limit: 100 },
  "student-pro": { label: "Student Pro", limit: 200 },
  "creator-pro": { label: "Creator Pro", limit: 200 },
  ultimate: { label: "Ultimate", limit: 500 },
};

const RESULT_VISIBILITY_OPTIONS = [
  { id: "immediate", label: "Immediately after submission", description: "Students see their results the moment they submit" },
  { id: "after_end", label: "After quiz ends", description: "Results unlock when the quiz closes" },
  { id: "manual", label: "When creator publishes results", description: "You control when results are released" },
] as const;

/* Fallback timezone list (used while the timezone API loads or on failure). */
const FALLBACK_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
];

/**
 * Build a readable select label for a timezone, e.g. "Asia/Kolkata (IST)".
 * The stored value stays the raw IANA name.
 */
function formatTimezoneLabel(name: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: name,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const abbr = parts.find((p) => p.type === "timeZoneName")?.value;
    if (abbr && abbr !== name && !abbr.includes("GMT+0") && !abbr.includes("GMT0")) {
      return `${name} (${abbr})`;
    }
  } catch {
    // fall through — use the raw IANA name
  }
  return name;
}

const toTimezoneOptions = (zones: string[]) =>
  zones.map((tz) => ({ label: formatTimezoneLabel(tz), value: tz }));

/* =============================================
   Quiz status (derived from backend state)
   ============================================= */
type QuizStatus = "draft" | "scheduled" | "registration_open" | "live" | "ended" | "completed";

const STATUS_META: Record<QuizStatus, { label: string; badge: string; dot: string }> = {
  draft: {
    label: "DRAFT",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    dot: "bg-amber-500",
  },
  scheduled: {
    label: "SCHEDULED",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-500",
    dot: "bg-blue-500",
  },
  registration_open: {
    label: "REGISTRATION OPEN",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500",
    dot: "bg-cyan-500",
  },
  live: {
    label: "LIVE",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    dot: "bg-emerald-500",
  },
  ended: {
    label: "ENDED",
    badge: "border-red-500/30 bg-red-500/10 text-red-500",
    dot: "bg-red-500",
  },
  completed: {
    label: "COMPLETED",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-500",
    dot: "bg-violet-500",
  },
};

function deriveQuizStatus(opts: {
  hasQuizId: boolean;
  status?: string;
  startTime?: string | null;
  endTime?: string | null;
  registrationEnabled?: boolean;
  registrationStart?: string;
  registrationEnd?: string;
}): QuizStatus {
  if (!opts.hasQuizId) return "draft";

  const status = opts.status;
  const now = new Date();

  if (status === "archived") return "completed";
  if (status === "draft") return "draft";

  const start = opts.startTime ? new Date(opts.startTime) : null;
  const end = opts.endTime ? new Date(opts.endTime) : null;

  if (end && now >= end) return "ended";
  if (start && now < start) {
    if (
      opts.registrationEnabled &&
      opts.registrationStart &&
      opts.registrationEnd &&
      now >= new Date(opts.registrationStart) &&
      now < new Date(opts.registrationEnd)
    ) {
      return "registration_open";
    }
    return "scheduled";
  }
  return "live";
}

const inputClass =
  "w-full h-11 rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all";

export default function QuizSettingsPage({
  initialDetails,
  onContinue,
  quizId,
  quizStatus,
  quizStartTime,
  quizEndTime,
}: QuizSettingsPageProps) {
  const toast = useToast();
  const router = useRouter();
  const planId = useAICreditsStore((s) => s.balance.planId);

  const plan = PLAN_STUDENT_LIMITS[planId] || PLAN_STUDENT_LIMITS.free;

  const [details, setDetails] = useState<QuizDetails>(initialDetails || DEFAULT_QUIZ_DETAILS);
  const [tagInput, setTagInput] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("info");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savingToServer, setSavingToServer] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [visibilityOptions, setVisibilityOptions] = useState<Array<{ id: number; heading: string; description: string }>>([]);

  /* Live backend state for the existing quiz (edit flow). */
  const [liveStatus, setLiveStatus] = useState<string | undefined>(quizStatus ?? undefined);
  const [liveStartTime, setLiveStartTime] = useState<string | null>(quizStartTime ?? null);
  const [liveEndTime, setLiveEndTime] = useState<string | null>(quizEndTime ?? null);
  const [confirmingStart, setConfirmingStart] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  /* Timezones — sourced from the existing timezone API with a local fallback */
  const [timezoneOptions, setTimezoneOptions] = useState<Array<{ label: string; value: string }>>(() =>
    toTimezoneOptions(FALLBACK_TIMEZONES)
  );

  const update = useCallback((patch: Partial<QuizDetails>) => {
    setDetails((d) => ({ ...d, ...patch }));
  }, []);

  /* ---- Fetch visibility options from the `quiz_visibility` DB table ---- */
  useEffect(() => {
    let cancelled = false;
    getQuizVisibilityOptions()
      .then((opts) => {
        if (!cancelled && Array.isArray(opts) && opts.length > 0) {
          setVisibilityOptions(
            opts.map((o) => ({ id: o.id, heading: o.heading, description: o.description || "" }))
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Fetch the timezone list from the existing timezone API ---- */
  useEffect(() => {
    let cancelled = false;
    getTimezones()
      .then((zones) => {
        if (!cancelled && Array.isArray(zones) && zones.length > 0) {
          setTimezoneOptions(toTimezoneOptions(zones));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Autosave to localStorage (debounced) ---- */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveQuizDetails(details);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [details]);

  /* ---- Scroll spy for active section ---- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  /* ---- Derived quiz status from the real backend state ---- */
  const derivedStatus = useMemo<QuizStatus>(
    () =>
      deriveQuizStatus({
        hasQuizId: Boolean(quizId),
        status: liveStatus,
        startTime: liveStartTime,
        endTime: liveEndTime,
        registrationEnabled: details.registrationEnabled,
        registrationStart: details.registrationStart,
        registrationEnd: details.registrationEnd,
      }),
    [quizId, liveStatus, liveStartTime, liveEndTime, details.registrationEnabled, details.registrationStart, details.registrationEnd]
  );

  const isLive = derivedStatus === "live";
  const isEnded = derivedStatus === "ended" || derivedStatus === "completed";

  /* ---- Visibility options sourced from the `quiz_visibility` table (fallback to static) ---- */
  const visibilitySource: Array<{ id: string | number; label: string; description: string; isDb: boolean }> =
    visibilityOptions.length > 0
      ? visibilityOptions.map((o) => ({ id: o.id, label: o.heading, description: o.description, isDb: true }))
      : VISIBILITY_OPTIONS.filter((o) => o.id !== "college").map((o) => ({ id: o.id, label: o.label, description: o.description, isDb: false }));

  /* ---- Tags (Topics) ---- */
  const addTag = () => {
    const val = tagInput.trim();
    if (val && !details.tags.includes(val)) {
      update({ tags: [...details.tags, val] });
    }
    setTagInput("");
  };

  const addTagInput = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  /* ---- Validation ---- */
  const registrationEndInvalid = Boolean(
    details.registrationEnabled &&
    details.registrationStart &&
    details.registrationEnd &&
    details.registrationEnd < details.registrationStart
  );
  const maxStudentsExceeded = details.maxParticipants > 0 && details.maxParticipants > plan.limit;

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (!details.name.trim()) e.name = "Quiz name is required.";
    if (!details.subject.trim()) e.subject = "Subject is required.";
    if (details.registrationEnabled) {
      if (!details.registrationStart) e.registrationStart = "Registration start time is required.";
      if (!details.registrationEnd) e.registrationEnd = "Registration end time is required.";
      if (registrationEndInvalid) e.registrationEnd = "Registration end cannot be before start.";
      if (!details.startDate) e.startDate = "Quiz start time is required.";
    }
    if (details.timeLimit <= 0) e.timeLimit = "Duration must be greater than 0.";
    if (maxStudentsExceeded) e.maxStudents = `Your ${plan.label} plan supports up to ${plan.limit} students per quiz.`;
    return e;
  }, [details, registrationEndInvalid, maxStudentsExceeded, plan]);

  /* ---- Progress for sidebar status ---- */
  const progress = useMemo(() => {
    let score = 0;
    if (details.name.trim()) score += 20;
    if (details.subject.trim()) score += 20;
    if (details.visibility) score += 10;
    if (details.tags.length > 0) score += 5;
    if (details.timeLimit > 0) score += 10;
    if (details.registrationEnabled) {
      if (details.registrationStart) score += 8;
      if (details.registrationEnd) score += 7;
    } else {
      score += 15;
    }
    if (details.maxParticipants > 0) score += 5;
    if (details.resultVisibility) score += 5;
    return Math.min(100, score);
  }, [details]);

  /* ---- Save & Continue ---- */
  const capitalizeWords = (str: string) =>
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const handleSaveDraft = () => {
    saveQuizDetails(details);
    toast.success({
      title: "Draft saved",
      description: "Your quiz settings have been saved as a draft.",
    });
  };

  const handleCancel = () => {
    router.push("/quiz");
  };

  const handleContinue = async () => {
    setAttempted(true);
    if (Object.keys(errors).length > 0) {
      const firstSection = details.registrationEnabled ? "registration" : "info";
      scrollToSection(firstSection);
      toast.error({
        title: "Missing information",
        description: "Please fix the highlighted fields before continuing.",
      });
      return;
    }

    const name = capitalizeWords(details.name);
    const description = capitalizeWords(details.description);
    const topic = capitalizeWords(details.topic);
    const subject = capitalizeWords(details.subject);

    setSavingToServer(true);
    try {
      const payload = {
        name,
        description,
        subject,
        topic,
        code: generateQuizCode(),
        difficulty: details.difficulty,
        visibility: details.visibilityId ?? undefined,
        timeLimit: details.timeLimit,
        starttime: details.startDate || undefined,
        endtime: details.endDate || undefined,
        timeZone: details.timeZone,
        maxParticipants: details.maxParticipants,
        randomizeQuestions: details.randomizeQuestions,
        randomizeOptions: details.randomizeOptions,
        showResultImmediately: details.resultVisibility === "immediate",
        showCorrectAnswersAfterSubmission: details.showCorrectAnswersAfterSubmission,
        negativeMarking: details.negativeMarking,
        negativeMarkValue: details.negativeMarkValue,
        marksPerQuestion: details.marksPerQuestion,
        totalQuestions: details.totalQuestions,
        totalMarks: details.totalMarks,
        passingPercentage: details.passingPercentage,
        passingMarks: details.passingMarks,
        tags: details.tags,
        registrationEnabled: details.registrationEnabled,
        registrationStart: details.registrationStart || undefined,
        registrationEnd: details.registrationEnd || undefined,
        emailResults: details.emailResults,
        leaderboard: details.leaderboard,
        leaderboardShowRank: details.leaderboardShowRank,
        leaderboardShowScore: details.leaderboardShowScore,
        leaderboardShowTime: details.leaderboardShowTime,
        resultVisibility: details.resultVisibility,
      };

      await createQuiz(payload);

      clearQuizState();
      onContinue({ ...details, name, description, topic, subject });
    } catch (err) {
      console.error("Failed to create quiz:", err);
      toast.error({
        title: "Could not save quiz",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSavingToServer(false);
    }
  };

  /* ---- Quick Start / End ---- */
  const handleStartQuiz = async () => {
    if (!quizId) return;
    setActionBusy(true);
    try {
      const updated = await updateQuizStatus(String(quizId), "published");
      setLiveStatus(updated?.status ?? "published");
      if (updated) {
        if (updated.starttime) setLiveStartTime(updated.starttime);
        if (updated.endtime) setLiveEndTime(updated.endtime);
      }
      setConfirmingStart(false);
      toast.success({
        title: "Quiz started",
        description: "Your quiz is now active for registered students.",
      });
    } catch (err) {
      console.error("Failed to start quiz:", err);
      toast.error({
        title: "Could not start quiz",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleEndQuiz = async () => {
    if (!quizId) return;
    setActionBusy(true);
    try {
      const updated = await updateQuizStatus(String(quizId), "archived");
      setLiveStatus(updated?.status ?? "archived");
      setConfirmingEnd(false);
      toast.success({
        title: "Quiz ended",
        description: "Further participation is stopped. All submitted responses and results are preserved.",
      });
    } catch (err) {
      console.error("Failed to end quiz:", err);
      toast.error({
        title: "Could not end quiz",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const visibilityIcon = (label: string) => {
    const key = label.toLowerCase();
    if (key.includes("public")) return Globe;
    if (key.includes("private")) return Lock;
    if (key.includes("class")) return GraduationCap;
    if (key.includes("college")) return School;
    return Globe;
  };

  const statusMeta = STATUS_META[derivedStatus];

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== Settings Sidebar ===== */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
        <nav className="settings-scroll h-full overflow-y-auto p-4">
          <p className="px-3 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Quiz Settings
          </p>
          <div className="space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isPink = section.tone === "pink";
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                    isActive
                      ? isPink
                        ? "bg-pink-500/10 text-pink-500 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.2)]"
                        : "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-pink-500/5 hover:text-text-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? (isPink ? "text-pink-500" : "text-accent") : "text-text-muted group-hover:text-text-primary"
                    )}
                    strokeWidth={isActive ? 2.2 : 2}
                  />
                  <span className={cn("font-medium", isActive && "font-semibold")}>{section.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="activeQuizSettingsIndicator"
                      className={cn("ml-auto h-1.5 w-1.5 rounded-full", isPink ? "bg-pink-500" : "bg-accent")}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ===== Quiz Status ===== */}
          <div className="mt-8 rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Quiz Status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold", statusMeta.badge)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                {statusMeta.label}
              </span>
            </div>
            {!quizId && (
              <p className="mt-2 text-[10px] font-medium text-text-secondary">
                Saved locally as a draft
              </p>
            )}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-text-secondary">
                <span>Quiz Setup</span>
                <span className="tabular-nums text-pink-500">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card-hover">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#7C3AED]"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* ===== Main Content ===== */}
      <div className="flex-1 overflow-y-auto">
        {/* ===== Page Header ===== */}
        <div className="sticky top-14 z-20 border-b border-border bg-background/80 px-6 py-5 backdrop-blur-xl lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-text-primary">
                  {details.name.trim() ? details.name : "Quiz Settings"}
                </h1>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold", statusMeta.badge)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                  {statusMeta.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Configure your quiz before adding questions and inviting students.
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                {saveStatus === "saving" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1.5 text-[10px] font-semibold text-pink-500"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </motion.span>
                )}
                {saveStatus === "saved" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-[10px] font-semibold text-success"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Auto saved
                  </motion.span>
                )}
              </div>
            </div>

            {/* ===== Quick Action Area ===== */}
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {quizId && !isEnded && (
                isLive ? (
                  <button
                    onClick={() => setConfirmingEnd(true)}
                    disabled={actionBusy}
                    className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(239,68,68,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(239,68,68,0.5)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
                  >
                    {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    End Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmingStart(true)}
                    disabled={actionBusy}
                    className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#7C3AED] px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
                  >
                    {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Start Quiz
                  </button>
                )
              )}

              <button
                onClick={handleSaveDraft}
                className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-all duration-200 hover:border-border-hover hover:bg-card-hover"
              >
                <Save className="h-4 w-4" /> Save Draft
              </button>

              <button
                onClick={handleContinue}
                disabled={savingToServer}
                className="group flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#7C3AED] px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.4)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingToServer ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Quiz...
                  </>
                ) : (
                  <>
                    Save &amp; Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ===== Mobile/Tablet Tab Nav ===== */}
          <div className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:hidden">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isPink = section.tone === "pink";
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? isPink
                        ? "bg-pink-500/10 text-pink-500"
                        : "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-pink-500/5"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Sections ===== */}
        <div className="mx-auto max-w-4xl space-y-8 px-6 py-8 lg:px-8">
          {/* ===== QUIZ INFO ===== */}
          <div id="info" ref={(el) => { sectionRefs.current["info"] = el; }} className="scroll-mt-32">
            <SettingsCard
              title="Quiz Info"
              description="Core details about your quiz"
              icon={<BookOpen className="h-5 w-5" />}
              iconClassName={SECTION_ICON_TONES.info}
            >
              <div className="space-y-6">
                <div>
                  <SettingsInput
                    label="Quiz Name"
                    value={details.name}
                    onChange={(v) => update({ name: v })}
                    placeholder="e.g. Data Structures Midterm"
                    required
                  />
                  {attempted && errors.name && <FieldError message={errors.name} />}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary">Description</label>
                  <textarea
                    value={details.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Briefly describe what this quiz covers..."
                    rows={3}
                    className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all duration-200 focus:border-pink-500 focus:shadow-[0_0_0_3px_var(--input-focus-ring)] resize-none"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <SearchableDropdown
                      label="Subject"
                      placeholder="Search subjects..."
                      required
                      value={details.subject}
                      selectedId={details.subjectId}
                      onSelect={(option) => update({ subject: option.label, subjectId: option.id })}
                      onClear={() => update({ subject: "", subjectId: "" })}
                      searchFn={async (query, signal) => {
                        const results = await getAllSubjects(query, signal);
                        return results.map((s) => ({ id: s.id, label: s.subject_name }));
                      }}
                      minChars={1}
                      debounceMs={300}
                      maxVisible={8}
                    />
                    {attempted && errors.subject && <FieldError message={errors.subject} />}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">Topics</label>
                    <div className="rounded-xl border border-input-border bg-input-bg px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {details.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 text-xs font-medium text-pink-500"
                          >
                            {tag}
                            <button onClick={() => update({ tags: details.tags.filter((t) => t !== tag) })} className="hover:text-text-primary transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={addTagInput}
                          onBlur={addTag}
                          placeholder={details.tags.length === 0 ? "Add topics, press Enter..." : "Add more..."}
                          className="min-w-[140px] flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-text-primary">Visibility</label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {visibilitySource.map((opt) => {
                      const Icon = visibilityIcon(opt.label);
                      const active = opt.isDb ? details.visibilityId === opt.id : details.visibility === opt.id;
                      return (
                        <button
                          key={String(opt.id)}
                          onClick={() =>
                            opt.isDb
                              ? update({ visibility: opt.label as QuizVisibility, visibilityId: opt.id as number })
                              : update({ visibility: opt.id as QuizVisibility, visibilityId: null })
                          }
                          className={cn(
                            "relative rounded-xl border p-4 text-left transition-all duration-200",
                            active
                              ? "border-pink-500 bg-pink-500/10 shadow-[0_0_0_3px_var(--input-focus-ring)]"
                              : "border-input-border bg-input-bg hover:border-border-hover"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <Icon className={cn("h-5 w-5", active ? "text-pink-500" : "text-text-muted")} />
                            {active && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#EC4899] to-[#7C3AED]">
                                <Check className="h-3 w-3 text-white" />
                              </span>
                            )}
                          </div>
                          <p className={cn("mt-2 text-sm font-semibold", active ? "text-pink-500" : "text-text-primary")}>
                            {opt.label}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SettingsCard>
          </div>

          {/* ===== REGISTRATION ===== */}
          <div id="registration" ref={(el) => { sectionRefs.current["registration"] = el; }} className="scroll-mt-32">
            <SettingsCard
              title="Registration"
              description="Configure registration and availability"
              icon={<Users className="h-5 w-5" />}
              iconClassName={SECTION_ICON_TONES.registration}
            >
              <div className="rounded-2xl border border-border bg-card p-5">
                <SettingsRow
                  label="Registration"
                  description={details.registrationEnabled ? "Students must register before the quiz" : "Anyone can take the quiz without registering"}
                >
                  <Toggle
                    checked={details.registrationEnabled}
                    onChange={(v) => update({ registrationEnabled: v })}
                  />
                </SettingsRow>
              </div>

              {details.registrationEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 grid gap-6 sm:grid-cols-2"
                >
                  <DateTimeField
                    label="Registration Start"
                    value={details.registrationStart}
                    onChange={(v) => update({ registrationStart: v })}
                    required
                    error={(attempted && errors.registrationStart) || undefined}
                  />
                  <DateTimeField
                    label="Registration End"
                    value={details.registrationEnd}
                    onChange={(v) => update({ registrationEnd: v })}
                    required
                    error={(attempted && errors.registrationEnd) || undefined}
                  />
                  <DateTimeField
                    label="Quiz Start Time"
                    value={details.startDate}
                    onChange={(v) => update({ startDate: v })}
                    required
                    error={(attempted && errors.startDate) || undefined}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">
                      Duration <span className="ml-0.5 text-danger">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="number"
                        min={1}
                        value={details.timeLimit}
                        onChange={(e) => update({ timeLimit: Number(e.target.value) })}
                        className={cn(inputClass, "pl-10")}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted">
                        minutes
                      </span>
                    </div>
                    {attempted && errors.timeLimit && <FieldError message={errors.timeLimit} />}
                  </div>

                  {/* Max students */}
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-text-primary">Maximum Students</label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        value={details.maxParticipants || ""}
                        onChange={(e) => update({ maxParticipants: Number(e.target.value) })}
                        className={cn(inputClass, "pl-10")}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                      <Info className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      Your {plan.label} plan supports up to {plan.limit} students per quiz.
                    </div>
                    {attempted && errors.maxStudents && <FieldError message={errors.maxStudents} />}
                  </div>
                </motion.div>
              )}

              {/* Timezone — sourced from the existing timezone API */}
              <div className="mt-6">
                <SettingsSelect
                  label="Timezone"
                  value={details.timeZone}
                  onChange={(v) => update({ timeZone: v })}
                  options={timezoneOptions}
                  searchable
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                  All quiz times are displayed in your selected timezone.
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-500">
                    {details.timeZone || "Select a timezone"}
                  </span>
                </div>
              </div>
            </SettingsCard>
          </div>

          {/* ===== RESPONSES ===== */}
          <div id="responses" ref={(el) => { sectionRefs.current["responses"] = el; }} className="scroll-mt-32">
            <SettingsCard
              title="Responses"
              description="How results and the leaderboard behave"
              icon={<BarChart3 className="h-5 w-5" />}
              iconClassName={SECTION_ICON_TONES.responses}
            >
              <div className="space-y-6">
                {/* Email results — admin only */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <SettingsRow
                    label="Email Quiz Results"
                    description="Send the complete quiz result report to the quiz admin."
                  >
                    <Toggle
                      checked={details.emailResults}
                      onChange={(v) => update({ emailResults: v })}
                    />
                  </SettingsRow>
                  {details.emailResults && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 flex items-start gap-2.5 rounded-xl border border-pink-500/15 bg-pink-500/[0.05] p-3.5"
                    >
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
                      <p className="text-xs leading-relaxed text-text-secondary">
                        The report is emailed to you (the quiz admin) and includes each student&rsquo;s name,
                        roll number, score, total marks, percentage, time taken, submission status and rank.
                        Students never receive performance emails.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Leaderboard */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <SettingsRow
                    label="Leaderboard"
                    description="Show a ranked leaderboard for this quiz"
                  >
                    <Toggle
                      checked={details.leaderboard}
                      onChange={(v) => update({ leaderboard: v })}
                    />
                  </SettingsRow>
                  {details.leaderboard && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.25 }}
                      className="mt-2 space-y-1"
                    >
                      <Toggle
                        checked={details.leaderboardShowRank}
                        onChange={(v) => update({ leaderboardShowRank: v })}
                        label="Show Rank"
                      />
                      <Toggle
                        checked={details.leaderboardShowScore}
                        onChange={(v) => update({ leaderboardShowScore: v })}
                        label="Show Score"
                      />
                      <Toggle
                        checked={details.leaderboardShowTime}
                        onChange={(v) => update({ leaderboardShowTime: v })}
                        label="Show Time Taken"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Result visibility */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Result Visibility</label>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {RESULT_VISIBILITY_OPTIONS.map((opt) => {
                      const active = details.resultVisibility === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => update({ resultVisibility: opt.id })}
                          className={cn(
                            "flex items-start justify-between gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                            active
                              ? "border-pink-500 bg-pink-500/10 shadow-[0_0_0_3px_var(--input-focus-ring)]"
                              : "border-input-border bg-input-bg hover:border-border-hover"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                active ? "border-pink-500 bg-gradient-to-r from-[#EC4899] to-[#7C3AED]" : "border-text-muted"
                              )}
                            >
                              {active && <Check className="h-3 w-3 text-white" />}
                            </span>
                            <div>
                              <p className={cn("text-sm font-semibold", active ? "text-pink-500" : "text-text-primary")}>
                                {opt.label}
                              </p>
                              <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SettingsCard>
          </div>
        </div>

        {/* ===== Sticky Bottom Action Bar ===== */}
        <div className="sticky bottom-0 z-20 border-t border-border bg-background/90 px-6 py-4 backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleSaveDraft}
              className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-medium text-text-primary transition-all duration-200 hover:border-border-hover hover:bg-card-hover"
            >
              <Save className="h-4 w-4" /> Save Draft
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="h-11 rounded-xl border border-border bg-card px-4 text-xs font-medium text-text-primary transition-all duration-200 hover:border-border-hover hover:bg-card-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={savingToServer}
                className="group flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#7C3AED] px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingToServer ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Quiz...
                  </>
                ) : (
                  <>
                    Save &amp; Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Start Quiz Confirmation (warning) ===== */}
      <ConfirmActionModal
        open={confirmingStart}
        variant="warning"
        icon={Zap}
        title="Start Quiz?"
        description="Starting this quiz will make it active for registered students."
        consequences={[
          "Make sure all questions and settings are ready before continuing.",
          "Students will be able to see and attempt the quiz once it starts.",
        ]}
        confirmLabel="Start Quiz"
        busy={actionBusy}
        onConfirm={handleStartQuiz}
        onCancel={() => setConfirmingStart(false)}
      />

      {/* ===== End Quiz Confirmation (danger) ===== */}
      <ConfirmActionModal
        open={confirmingEnd}
        variant="danger"
        icon={Square}
        title="End Quiz?"
        description="Ending the quiz will stop further participation and finalize the quiz state."
        consequences={[
          "Students will no longer be able to attempt the quiz.",
          "All submitted responses and results will be preserved.",
          "This action may not be reversible.",
        ]}
        confirmLabel="End Quiz"
        busy={actionBusy}
        onConfirm={handleEndQuiz}
        onCancel={() => setConfirmingEnd(false)}
      />
    </div>
  );
}

/* =============================================
   Helpers
   ============================================= */
function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-danger">
      <AlertTriangle className="h-3 w-3" /> {message}
    </p>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <div className="relative">
        <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            inputClass,
            "pl-10 [color-scheme:light] dark:[color-scheme:dark]",
            error && "!border-danger focus:!border-danger focus:ring-danger/10"
          )}
        />
      </div>
      {error && <FieldError message={error} />}
    </div>
  );
}

/* =============================================
   Start / End confirmation modal
   Distinct warning (start) and danger (end) styling.
   ============================================= */
function ConfirmActionModal({
  open,
  variant,
  icon: Icon,
  title,
  description,
  consequences,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  variant: "warning" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  consequences: string[];
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isDanger = variant === "danger";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-2xl border bg-card p-6 shadow-2xl",
              isDanger ? "border-danger/30" : "border-amber-500/30"
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1">
              <div className={cn("h-full w-full", isDanger ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-amber-500 to-orange-500")} />
            </div>

            <div className="mb-4 flex items-start gap-3.5">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  isDanger
                    ? "bg-danger/10 text-danger shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                    : "bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
              </div>
            </div>

            <div
              className={cn(
                "space-y-2 rounded-xl border p-3.5",
                isDanger ? "border-danger/15 bg-danger/[0.04]" : "border-amber-500/15 bg-amber-500/[0.04]"
              )}
            >
              {consequences.map((line) => (
                <p key={line} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                  <AlertTriangle className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isDanger ? "text-danger" : "text-amber-500")} />
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={busy}
                className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-text-primary transition-all hover:border-border-hover hover:bg-card-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-all disabled:opacity-50",
                  isDanger
                    ? "bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_4px_16px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_24px_rgba(239,68,68,0.55)] hover:brightness-105"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_4px_16px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_24px_rgba(245,158,11,0.55)] hover:brightness-105"
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
