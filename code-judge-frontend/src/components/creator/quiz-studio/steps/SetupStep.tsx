"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { Badge, StudioStepHeader, StudioStepLayout } from "../primitives";
import { DifficultySlider } from "./DifficultySlider";
import { SearchableDropdown } from "@/components/ui";
import { getAllSubjects, generateQuizCode as fetchQuizCode } from "@/services/quiz";
import { useQuizReferenceStore } from "@/store/quizReferenceStore";
import { AiStreamText } from "@/components/ui";

const CREATE_CHOICES = [
  {
    id: "ai",
    label: "AI Generate",
    icon: Sparkles,
    desc: "Start with an empty canvas and build manually.",
    meta: "AI ASSISTED",
  },
  {
    id: "scratch",
    label: "From Scratch",
    icon: FileText,
    desc: "Generate questions from a topic, PDF, or document.",
    meta: "FULL CONTROL",
  },
] as const;

export function SetupStep() {
  const router = useRouter();
  const { state, updateInfo, editMode } = useStudio();
  const [choice, setChoice] = useState<"scratch" | "ai" | null>("scratch");

  const info = state.info;
  const fetchedRef = useRef(false);
  const { difficultyOptions, fetchAll } = useQuizReferenceStore();

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (!editMode) {
      fetchQuizCode().then((code) => updateInfo({ code })).catch(() => {});
    }
    fetchAll();
  }, [editMode]);

  const hasBasicInfo = info.title.trim().length >= 3;

  return (
    <StudioStepLayout width="wide">
      {/* Creation method choice — only on create, not edit */}
      {!editMode && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StudioStepHeader title="Start quiz" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:gap-3"
          >
            {CREATE_CHOICES.map((c) => (
              <ChoiceCard
                key={c.id}
                icon={c.icon}
                label={c.label}
                meta={c.meta}
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
          </motion.div>
        </>
      )}

      {/* Basic information — white card with shadow like image */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: editMode ? 0 : 0.15 }}
        className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-card border border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 sm:p-6 space-y-5 sm:space-y-6"
      >
        <div className="border-b border-pink-500/20 pb-3 min-w-0">
          <h3 className="text-[13px] sm:text-sm font-bold uppercase tracking-wider text-pink-500 break-words">
            Basic Information
          </h3>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Quiz Title</label>
            <input
              value={info.title}
              onChange={(e) => updateInfo({ title: e.target.value.slice(0, 100) })}
              maxLength={100}
              placeholder="e.g. JEE Main 2026 Mock Test 01"
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-input-border bg-[#F8FAFC] dark:bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
            />
            <p className="text-[11px] text-text-muted text-right">{info.title.length}/100</p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <SearchableDropdown
              label="Subject"
              placeholder="Search subjects..."
              required
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

          {/* Difficulty — sliding selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Difficulty</label>
            <DifficultySlider
              options={difficultyOptions}
              selectedId={info.difficultyId}
              selectedHeading={info.difficulty}
              onSelect={(opt) => updateInfo({ difficulty: opt.heading, difficultyId: opt.id })}
            />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Short Description</label>
            <textarea
              value={info.shortDescription}
              onChange={(e) => updateInfo({ shortDescription: e.target.value.slice(0, 250) })}
              rows={2}
              maxLength={250}
              placeholder="A concise summary shown in listings."
              className="w-full rounded-lg border border-gray-200 dark:border-input-border bg-[#F8FAFC] dark:bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
            />
            <p className="text-[11px] text-text-muted text-right">{info.shortDescription.length}/250</p>
          </div>

        </div>
      </motion.div>
    </StudioStepLayout>
  );
}

function ChoiceCard({
  icon: Icon,
  label,
  meta,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  meta: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col items-center gap-2 rounded-xl border p-3 text-center text-sm transition-all duration-150 ease-out hover:-translate-y-0.5 overflow-hidden sm:p-4",
        selected
          ? "border-pink-500 bg-white dark:bg-card text-pink-600 shadow-[0_4px_16px_rgba(236,72,153,0.12),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(236,72,153,0.15)]"
          : "border-gray-200 dark:border-border bg-white dark:bg-card shadow-[0_2px_10px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none hover:border-pink-500/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          selected
            ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-500 border border-pink-100 dark:border-pink-500/20"
            : "bg-gray-50 dark:bg-card-hover/40 text-gray-500 dark:text-text-secondary border border-gray-100 dark:border-transparent"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-semibold text-text-primary break-words">{label.toLowerCase().includes("ai") ? <AiStreamText text={label} /> : label}</span>
      <span className="mt-0.5 inline-flex items-center rounded-md bg-gray-100 dark:bg-pink-500/10 border border-gray-200 dark:border-pink-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-pink-600">
        {meta}
      </span>
    </button>
  );
}

const DIFFICULTY_TEXT_COLORS: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-orange-600 dark:text-orange-400",
  expert: "text-rose-600 dark:text-rose-400",
};

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = (t: string) => {
    const v = t.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <Badge key={t} color="neutral">
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="ml-1.5 -mr-0.5 rounded p-0.5 hover:text-rose-500"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          if (e.target.value.includes(",")) add(e.target.value.replace(",", ""));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(input);
          }
        }}
        placeholder="Type and press Enter…"
        className="h-8 min-w-35 flex-1 border-none bg-transparent text-xs text-text-primary placeholder-text-muted outline-none"
      />
    </div>
  );
}
