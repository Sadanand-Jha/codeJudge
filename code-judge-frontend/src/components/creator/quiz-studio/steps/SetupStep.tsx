"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Check, Clock, FileText, Search, ShieldCheck, Sparkles, Star, Target } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { SearchableDropdown, AiStreamText } from "@/components/ui";
import { getAllSubjects, generateQuizCode as fetchQuizCode } from "@/services/quiz";
import { useQuizReferenceStore } from "@/store/quizReferenceStore";
import { useAuthStore } from "@/store/authStore";
import { WHOLE_QUIZ_AI_ENABLED } from "@/config/creatorFeatures";
import { toast } from "@/lib/toast";

const CREATE_CHOICES = [
  {
    id: "ai",
    label: "AI Generate",
    icon: Sparkles,
    desc: WHOLE_QUIZ_AI_ENABLED
      ? "Give a topic, AI will draft the questions."
      : "Generate a complete quiz from a topic or file. Coming soon.",
  },
  {
    id: "scratch",
    label: "From Scratch",
    icon: FileText,
    desc: "Build manually on an empty canvas, full control.",
  },
] as const;

/** Fallback difficulty levels (used until the reference store loads). */
const FALLBACK_DIFFICULTY = [
  { id: "", heading: "Easy" },
  { id: "", heading: "Medium" },
  { id: "", heading: "Hard" },
  { id: "", heading: "Expert" },
];

const FIELD_CLS =
  "w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-[15px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

export function SetupStep() {
  const router = useRouter();
  const { state, updateInfo, editMode } = useStudio();
  const [choice, setChoice] = useState<"scratch" | "ai" | null>("scratch");

  const info = state.info;
  const fetchedRef = useRef(false);
  const { difficultyOptions, fetchAll } = useQuizReferenceStore();
  const teacherAvatar = useAuthStore((s) => s.user?.avatarUrl ?? null);
  const teacherName = useAuthStore((s) => s.user?.displayName ?? null);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (!editMode) {
      fetchQuizCode().then((code) => updateInfo({ code })).catch(() => {});
    }
    fetchAll();
  }, [editMode]);

  const difficulties = difficultyOptions.length ? difficultyOptions : FALLBACK_DIFFICULTY;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-7"
      >
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[34px]">
          Create a new quiz
        </h1>
        <p className="mt-1.5 text-[15px] font-medium text-[var(--qs-muted)] sm:text-base">
          Fill in the basic details first. Questions come in the next steps.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch">
        {/* ── Left column: creation mode + basic info ── */}
        <div className="flex h-full min-w-0 flex-col gap-6">
          {/* Creation method choice — only on create, not edit */}
          {!editMode && (
            <motion.section
              aria-label="Creation mode"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {CREATE_CHOICES.map((c) => (
                <ChoiceCard
                  key={c.id}
                  icon={c.icon}
                  label={c.label}
                  desc={c.desc}
                  selected={choice === c.id}
                  ai={c.id === "ai"}
                  comingSoon={c.id === "ai" && !WHOLE_QUIZ_AI_ENABLED}
                  onClick={() => {
                    if (c.id === "ai") {
                      if (WHOLE_QUIZ_AI_ENABLED) router.push("/creator/quizzes/ai-generate");
                    } else {
                      setChoice(c.id);
                    }
                  }}
                />
              ))}
            </motion.section>
          )}

          {/* Basic information */}
          <motion.section
            aria-label="Basic information"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: editMode ? 0 : 0.12 }}
            className="flex flex-1 flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6 sm:p-8"
          >
            <h2 className="text-lg font-extrabold text-[var(--qs-ink)]">
              Basic information
            </h2>

            <div className="mt-6 flex flex-col gap-6">
              {/* Title */}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="quiz-title" className="text-sm font-bold text-[var(--qs-ink)]">
                    Quiz title
                  </label>
                  <span className="text-xs font-medium text-[var(--qs-muted)]">
                    {info.title.length} / 100
                  </span>
                </div>
                <input
                  id="quiz-title"
                  type="text"
                  value={info.title}
                  onChange={(e) => updateInfo({ title: e.target.value.slice(0, 100) })}
                  maxLength={100}
                  placeholder="e.g. JEE Main 2026 Mock Test 01"
                  className={cn(FIELD_CLS, "h-12")}
                />
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-2">
                <SearchableDropdown
                  label="Subject"
                  placeholder="Search subjects (Physics, Chemistry, Maths…)"
                  required
                  icon={<Search className="h-4 w-4" />}
                  value={info.subject}
                  selectedId={info.subjectId}
                  onSelect={(option) => updateInfo({ subject: option.label, subjectId: option.id })}
                  onClear={() => updateInfo({ subject: "", subjectId: "" })}
                  searchFn={async (query, signal) => {
                    const results = await getAllSubjects(query, signal);
                    return results.map((s) => ({ id: s.id, label: s.subject_name }));
                  }}
                  minChars={1}
                  debounceMs={300}
                  maxVisible={8}
                />
              </div>

              {/* Difficulty — segmented control */}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold text-[var(--qs-ink)]">
                  Difficulty
                </legend>
                <div className="grid grid-cols-4 gap-1 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-1.5">
                  {difficulties.map((opt) => {
                    const selected =
                      (info.difficultyId !== "" && info.difficultyId != null
                        ? String(info.difficultyId) === String(opt.id)
                        : false) || info.difficulty.toLowerCase() === opt.heading.toLowerCase();
                    return (
                      <button
                        key={opt.id || opt.heading}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateInfo({ difficulty: opt.heading, difficultyId: opt.id })}
                        className={cn(
                          "flex min-h-[44px] items-center justify-center rounded-[10px] text-sm transition-colors",
                          selected
                            ? "border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] font-extrabold text-[var(--qs-bg)]"
                            : "font-bold text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
                        )}
                      >
                        {opt.heading}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Short Description */}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="quiz-desc" className="text-sm font-bold text-[var(--qs-ink)]">
                    Short description
                  </label>
                  <span className="text-xs font-medium text-[var(--qs-muted)]">
                    {info.shortDescription.length} / 250
                  </span>
                </div>
                <textarea
                  id="quiz-desc"
                  value={info.shortDescription}
                  onChange={(e) => updateInfo({ shortDescription: e.target.value.slice(0, 250) })}
                  rows={3}
                  maxLength={250}
                  placeholder="A concise summary shown in listings."
                  className={cn(FIELD_CLS, "resize-y py-3 leading-relaxed")}
                />
              </div>
            </div>
          </motion.section>
        </div>

        {/* ── Right column: live preview ── */}
        <motion.aside
          aria-label="Preview"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="flex h-full min-h-0 flex-col"
        >
          {/* Miniature model of the student join view */}
          <div
            className="relative flex flex-1 flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
            aria-label="Miniature preview of the student join screen"
          >
            <div className="shrink-0 border-b-2 border-[var(--qs-line)] px-4 py-2.5 text-center">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Live preview
              </span>
            </div>
            {/* Header band with rating + avatar, like the join screen */}
            <div className="relative border-b-2 border-[var(--qs-line)] bg-[var(--qs-brand)] px-4 py-3">
              <div className="mb-2.5 flex justify-center">
                <span className="inline-flex items-center gap-0.5" role="img" aria-label="Rated 4.8 out of 5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-[var(--qs-sun)] text-[var(--qs-sun)]" aria-hidden="true" />
                  ))}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative grid aspect-square w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/30 bg-[var(--qs-brand)] text-lg font-extrabold uppercase text-white">
                  {teacherAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may be remote/user-configured
                    <img src={teacherAvatar} alt={`${teacherName || "Quiz creator"} avatar`} className="h-full w-full object-cover" />
                  ) : (
                    (teacherName || info.title).trim().slice(0, 1) || "Q"
                  )}
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-ok)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn("break-words text-[15px] font-extrabold leading-snug tracking-[-0.02em]", info.title ? "text-white" : "text-white/60")}>
                    {info.title || "Your quiz title"}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-white/70">
                    {teacherName || "You"} · {info.subject || "Subject"}
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border-2 border-[#a85d00]/30 bg-[#fff3d6] px-1.5 py-px text-[10px] font-extrabold tabular-nums text-[#a85d00]">
                      <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" /> 4.8
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-1 flex-col p-4">
              <p className={cn("line-clamp-2 text-xs font-medium leading-relaxed", info.shortDescription ? "text-[var(--qs-muted)]" : "text-[var(--qs-muted)]/70")}>
                {info.shortDescription || "Your description will appear here as you type."}
              </p>

              {/* Info cards, like the join screen */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { icon: Clock, label: "Responses", value: "Until ended" },
                  { icon: Target, label: "Total Marks", value: "—" },
                  { icon: BookOpen, label: "Difficulty", value: info.difficulty || "Medium" },
                  { icon: FileText, label: "Questions", value: String(state.questions.length) },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        {label}
                      </span>
                      <span className="block truncate text-xs font-bold tabular-nums text-[var(--qs-ink)]">
                        {value}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Secure-entry strip, like the join screen */}
              <div className="mt-3 rounded-[14px] border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--qs-ok)]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Secure entry confirmed
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["Access controlled", "Private session", "Auto-saved answers"].map((pill) => (
                    <span
                      key={pill}
                      className="inline-flex items-center rounded-full border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-surface)] px-2 py-0.5 text-[9px] font-bold text-[var(--qs-ok)]"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Join button replica (preview only, non-interactive) */}
              <div className="mt-auto pt-3" aria-hidden="true">
                <div className="pointer-events-none flex h-12 w-full select-none items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-sm font-extrabold text-[#1a1240]">
                  Join Quiz
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Tip */}
          {/* <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] p-4 text-sm font-medium leading-relaxed text-[var(--qs-muted)] sm:p-5">
            <strong className="font-extrabold text-[var(--qs-ink)]">Tip:</strong> Include the exam and year in the title,
            like &quot;NEET 2026 Biology Mock 03&quot;, so students can search easily.
          </div> */}
        </motion.aside>
      </div>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  label,
  desc,
  selected,
  ai = false,
  comingSoon = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  desc: string;
  selected: boolean;
  ai?: boolean;
  comingSoon?: boolean;
  onClick: () => void;
}) {
  const activeAi = ai && !comingSoon;
  return (
    <button
      type="button"
      aria-disabled={comingSoon || undefined}
      onClick={
        comingSoon
          ? () =>
              toast.info({
                title: "Coming soon",
                description: "AI quiz generation is not available yet.",
              })
          : onClick
      }
      className={cn(
        "relative flex items-start gap-4 overflow-hidden rounded-[18px] border-2 p-5 text-left transition-colors",
        comingSoon
          ? "cursor-not-allowed border-[var(--qs-line)] bg-[var(--qs-surface)] opacity-60"
          : activeAi
            ? "border-[var(--qs-ink)] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white shadow-[4px_4px_0_var(--qs-sun)]"
            : selected
              ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
              : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
      )}
    >
      {activeAi && (
        <span
          aria-hidden="true"
          className="qs-ai-shimmer pointer-events-none absolute inset-y-0 left-0 w-14 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      )}
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2",
          activeAi
            ? "border-white/40 bg-white/15 text-white"
            : selected
              ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-white"
              : "border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className={cn("text-base font-extrabold", activeAi ? "text-white" : "text-[var(--qs-ink)]")}>
          {label.toLowerCase().includes("ai") ? <AiStreamText text={label} /> : label}
        </span>
        <span className={cn("text-sm font-medium leading-snug", activeAi ? "text-white/85" : "text-[var(--qs-muted)]")}>
          {desc}
        </span>
      </span>
      {comingSoon && (
        <span className="absolute right-3.5 top-3.5 rounded-full border-2 border-[#a85d00]/30 bg-[#fff3d6] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#a85d00]">
          Coming soon
        </span>
      )}
      {!comingSoon && selected && (
        <span className="absolute right-3.5 top-3.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]">
          <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
