"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Globe,
  GraduationCap,
  Lock,
  Save,
  School,
  Users,
  Check,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { QuizDetails, DEFAULT_QUIZ_DETAILS, VISIBILITY_OPTIONS, QuizVisibility } from "./types";
import { saveQuizDetails, clearQuizState } from "@/utils/quizStorage";
import { getAllSubjects, getQuizVisibilityOptions, createQuiz } from "@/services/quiz";
import { generateQuizCode } from "@/utils/quizCode";
import { SearchableDropdown } from "@/components/ui";
import { SettingsCard, SettingsInput, Toggle, SettingsRow } from "@/components/ui/settings";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { useAICreditsStore } from "@/store/aiCreditsStore";

interface QuizSettingsPageProps {
  initialDetails?: QuizDetails;
  onContinue: (details: QuizDetails) => void;
}

/* =============================================
   Navigation Sections
   ============================================= */
const SECTIONS = [
  { id: "info", label: "Quiz Info", icon: BookOpen },
  { id: "registration", label: "Registration", icon: Users },
  { id: "responses", label: "Responses", icon: BarChart3 },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

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

const inputClass =
  "w-full h-11 rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all";

export default function QuizSettingsPage({ initialDetails, onContinue }: QuizSettingsPageProps) {
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

  /* ---- Autosave to localStorage (debounced) ---- */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveQuizDetails(details);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
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

  const visibilityIcon = (label: string) => {
    const key = label.toLowerCase();
    if (key.includes("public")) return Globe;
    if (key.includes("private")) return Lock;
    if (key.includes("class")) return GraduationCap;
    if (key.includes("college")) return School;
    return Globe;
  };

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
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-accent" : "text-text-muted group-hover:text-text-primary"
                    )}
                    strokeWidth={isActive ? 2.2 : 2}
                  />
                  <span className={cn("font-medium", isActive && "font-semibold")}>{section.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="activeQuizSettingsIndicator"
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"
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
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning">Draft</span>
              <span className="text-[10px] font-medium text-text-secondary">Saved locally</span>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-text-secondary">
                <span>Quiz Setup</span>
                <span className="tabular-nums text-accent">{progress}%</span>
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-text-primary">Quiz Settings</h1>
                <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning">Draft</span>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Configure your quiz before adding questions and inviting students.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-semibold text-accent"
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

          {/* ===== Mobile/Tablet Tab Nav ===== */}
          <div className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:hidden">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                    isActive ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-accent/5"
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
                    className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all duration-200 focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)] resize-none"
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
                            className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/20 px-2.5 py-1 text-xs font-medium text-accent"
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
                              ? "border-accent bg-accent/10 shadow-[0_0_0_3px_var(--input-focus-ring)]"
                              : "border-input-border bg-input-bg hover:border-border-hover"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <Icon className={cn("h-5 w-5", active ? "text-accent" : "text-text-muted")} />
                            {active && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                                <Check className="h-3 w-3 text-white" />
                              </span>
                            )}
                          </div>
                          <p className={cn("mt-2 text-sm font-semibold", active ? "text-accent" : "text-text-primary")}>
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
                      <Info className="h-3.5 w-3.5 shrink-0 text-accent" />
                      Your {plan.label} plan supports up to {plan.limit} students per quiz.
                    </div>
                    {attempted && errors.maxStudents && <FieldError message={errors.maxStudents} />}
                  </div>
                </motion.div>
              )}
            </SettingsCard>
          </div>

          {/* ===== RESPONSES ===== */}
          <div id="responses" ref={(el) => { sectionRefs.current["responses"] = el; }} className="scroll-mt-32">
            <SettingsCard
              title="Responses"
              description="How results and the leaderboard behave"
              icon={<BarChart3 className="h-5 w-5" />}
            >
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <SettingsRow
                    label="Email Results"
                    description="Send quiz results to students after the quiz is processed"
                  >
                    <Toggle
                      checked={details.emailResults}
                      onChange={(v) => update({ emailResults: v })}
                    />
                  </SettingsRow>
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
                              ? "border-accent bg-accent/10 shadow-[0_0_0_3px_var(--input-focus-ring)]"
                              : "border-input-border bg-input-bg hover:border-border-hover"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                active ? "border-accent bg-accent" : "border-text-muted"
                              )}
                            >
                              {active && <Check className="h-3 w-3 text-white" />}
                            </span>
                            <div>
                              <p className={cn("text-sm font-semibold", active ? "text-accent" : "text-text-primary")}>
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
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
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
                className="group flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-5 text-xs font-bold text-white transition-all duration-200 hover:shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
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
