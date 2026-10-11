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

/** Brand + surface tokens taken from the "Create Quiz — Redesign" spec. */
const BRAND = "#D10F4D";
const CARD_BORDER = "#EDE6EA";
const INPUT_BORDER = "#DDD2D8";
const INPUT_BG = "#FBF8F9";
const SEGMENT_BG = "#F5EFF2";
const TEXT_PRIMARY = "#1B1620";
const TEXT_SECONDARY = "#5E5463";
const TEXT_MUTED = "#6B6170";
const PLACEHOLDER = "#8A7F90";

const CREATE_CHOICES = [
  {
    id: "ai",
    label: "AI Generate",
    icon: Sparkles,
    desc: "Give a topic, AI will draft the questions.",
    meta: "AI ASSISTED",
    iconBg: "#F3EEF6",
    iconStroke: "#5B3F8C",
  },
  {
    id: "scratch",
    label: "From Scratch",
    icon: FileText,
    desc: "Build manually on an empty canvas, full control.",
    meta: "FULL CONTROL",
    iconBg: "#F3EEF6",
    iconStroke: "#5B3F8C",
  },
] as const;

/** Text colour of the active difficulty, keyed by lower-cased heading. */
const DIFFICULTY_TEXT_COLORS: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-orange-600 dark:text-orange-400",
  expert: "text-rose-600 dark:text-rose-400",
};

/** Fallback difficulty levels (used until the reference store loads). */
const FALLBACK_DIFFICULTY = [
  { id: "", heading: "Easy" },
  { id: "", heading: "Medium" },
  { id: "", heading: "Hard" },
  { id: "", heading: "Expert" },
];

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
        <h1
          className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[34px]"
          style={{ color: TEXT_PRIMARY }}
        >
          Create a new quiz
        </h1>
        <p className="mt-1.5 text-[15px] sm:text-base" style={{ color: TEXT_SECONDARY }}>
          Fill in the basic details first. Questions come in the next steps.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Left column: creation mode + basic info ── */}
        <div className="flex min-w-0 flex-col gap-6">
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
                  iconBg={c.iconBg}
                  iconStroke={c.iconStroke}
                  selected={choice === c.id}
                  onClick={() => {
                    if (c.id === "ai") {
                      router.push("/creator/quizzes/ai-generate");
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
            className="rounded-[20px] border bg-white p-6 dark:bg-card sm:p-8"
            style={{ borderColor: CARD_BORDER }}
          >
            <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
              Basic information
            </h2>

            <div className="mt-6 flex flex-col gap-6">
              {/* Title */}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="quiz-title" className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                    Quiz title
                  </label>
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>
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
                  className="h-12 w-full rounded-xl border px-4 text-[15px] outline-none transition-colors focus:border-[#D10F4D] focus:ring-2 focus:ring-[#D10F4D]/15"
                  style={{ borderColor: INPUT_BORDER, backgroundColor: INPUT_BG, color: TEXT_PRIMARY }}
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
                <legend className="mb-2 text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  Difficulty
                </legend>
                <div
                  className="grid grid-cols-4 gap-1 rounded-[14px] p-1.5"
                  style={{ backgroundColor: SEGMENT_BG }}
                >
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
                          "flex min-h-[44px] items-center justify-center rounded-[10px] text-sm transition-all",
                          selected
                            ? "bg-white font-bold shadow-[0_1px_3px_rgba(60,20,40,0.15)] dark:bg-card " +
                                (DIFFICULTY_TEXT_COLORS[opt.heading.toLowerCase()] ?? "text-text-primary")
                            : "bg-transparent font-semibold hover:text-text-primary"
                        )}
                        style={!selected ? { color: TEXT_SECONDARY } : undefined}
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
                  <label htmlFor="quiz-desc" className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                    Short description
                  </label>
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>
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
                  className="w-full resize-y rounded-xl border px-4 py-3 text-[15px] leading-relaxed outline-none transition-colors focus:border-[#D10F4D] focus:ring-2 focus:ring-[#D10F4D]/15"
                  style={{ borderColor: INPUT_BORDER, backgroundColor: INPUT_BG, color: TEXT_PRIMARY }}
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
          className="flex flex-col gap-4"
        >
          <span className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: TEXT_MUTED }}>
            Live preview
          </span>

          {/* Miniature model of the student join view */}
          <div
            className="relative overflow-hidden rounded-[20px] border border-white/70 bg-white/75 shadow-[0_24px_80px_-28px_rgba(60,46,140,0.45)] backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#111526]/80"
            aria-label="Miniature preview of the student join screen"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="absolute -left-20 top-24 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.055]" style={{ backgroundImage: "linear-gradient(rgba(124,108,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(124,108,255,.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            </div>

            {/* Header band with rating + avatar, like the join screen */}
            <div className="relative border-b border-[#E4E7EC]/70 bg-gradient-to-br from-violet-500/[0.13] via-transparent to-cyan-400/[0.08] px-4 py-3 dark:border-white/[0.07]">
              <div className="mb-2.5 flex justify-center">
                <span className="inline-flex items-center gap-0.5" role="img" aria-label="Rated 4.8 out of 5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  ))}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative grid aspect-square w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/80 bg-gradient-to-br from-[#8B7CFF] to-[#5B4CE2] text-lg font-bold uppercase text-white dark:border-violet-300/20">
                  {teacherAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may be remote/user-configured
                    <img src={teacherAvatar} alt={`${teacherName || "Quiz creator"} avatar`} className="h-full w-full object-cover" />
                  ) : (
                    (teacherName || info.title).trim().slice(0, 1) || "Q"
                  )}
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="break-words text-[15px] font-bold leading-snug tracking-[-0.02em]"
                    style={{ color: info.title ? TEXT_PRIMARY : PLACEHOLDER }}
                  >
                    {info.title || "Your quiz title"}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
                    {teacherName || "You"} · {info.subject || "Subject"}
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-bold tabular-nums text-amber-600 dark:text-amber-300">
                      <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" /> 4.8
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative p-4">

              <p
                className="line-clamp-2 text-xs leading-relaxed"
                style={{ color: info.shortDescription ? TEXT_SECONDARY : PLACEHOLDER }}
              >
                {info.shortDescription || "Your description will appear here as you type."}
              </p>

              {/* Info cards, like the join screen */}
              <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { icon: Clock, label: "Duration", value: "Not set", color: "#3B82F6" },
                { icon: Target, label: "Total Marks", value: "—", color: "#A855F7" },
                { icon: BookOpen, label: "Difficulty", value: info.difficulty || "Medium", color: "#F59E0B" },
                { icon: FileText, label: "Questions", value: String(state.questions.length), color: "#8B5CF6" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-2xl border border-[#E4E7EC]/80 bg-white/55 p-2.5 dark:border-white/[0.07] dark:bg-white/[0.025]"
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border"
                    style={{ color, borderColor: `${color}26`, backgroundColor: `${color}1A` }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider" style={{ color: PLACEHOLDER }}>
                      {label}
                    </span>
                    <span className="block truncate text-xs font-bold tabular-nums" style={{ color: TEXT_PRIMARY }}>
                      {value}
                    </span>
                  </span>
                </div>
              ))}
            </div>

              {/* Secure-entry strip, like the join screen */}
              <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.09] to-cyan-500/[0.05] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure entry confirmed
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {["Access controlled", "Private session", "Auto-saved answers"].map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center rounded-full border border-emerald-500/10 bg-white/45 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-black/10 dark:text-emerald-200"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

              {/* Join button replica (preview only, non-interactive) */}
              <div className="mt-3" aria-hidden="true">
                <div className="group pointer-events-none relative flex h-12 w-full select-none items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 text-xs font-bold text-white dark:from-[#7765F5] dark:via-[#8B7CFF] dark:to-[#9A6BFF]">
                  <span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/20 blur-sm" />
                  Join Quiz
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div
            className="rounded-2xl p-4 text-sm leading-relaxed sm:p-5"
            style={{ backgroundColor: SEGMENT_BG, color: "#4A4050" }}
          >
            <strong style={{ color: TEXT_PRIMARY }}>Tip:</strong> Include the exam and year in the title,
            like &quot;NEET 2026 Biology Mock 03&quot;, so students can search easily.
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  label,
  desc,
  iconBg,
  iconStroke,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  desc: string;
  iconBg: string;
  iconStroke: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-start gap-4 rounded-2xl p-5 text-left transition-all",
        selected
          ? "border-2 bg-[#FDF1F5] dark:bg-[#D10F4D]/10"
          : "border bg-white hover:border-[#D10F4D]/40 dark:bg-card"
      )}
      style={{ borderColor: selected ? BRAND : "#E4DAE0", color: TEXT_PRIMARY }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={selected ? { backgroundColor: BRAND } : { backgroundColor: iconBg }}
      >
        <Icon className="h-5 w-5" style={selected ? { color: "#fff" } : { color: iconStroke }} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>
          {label.toLowerCase().includes("ai") ? <AiStreamText text={label} /> : label}
        </span>
        <span className="text-sm leading-snug" style={{ color: TEXT_MUTED }}>
          {desc}
        </span>
      </span>
      {selected && (
        <span
          className="absolute right-3.5 top-3.5 flex h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{ backgroundColor: BRAND }}
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
