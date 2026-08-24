"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  Upload,
  X,
  Clock,
  ListChecks,
  Award,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { Badge } from "../primitives";
import { SearchableDropdown } from "@/components/ui";
import { getAllSubjects, getAllExamCategories, generateQuizCode as fetchQuizCode, getQuizDifficultyOptions } from "@/services/quiz";
import { toast } from "@/lib/toast";

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
  {
    id: "import",
    label: "Import File",
    icon: Upload,
    desc: "Bring in a quiz from a file (ZIP, CSV, Excel, PDF).",
    meta: "BULK IMPORT",
  },
  {
    id: "duplicate",
    label: "Duplicate",
    icon: ListChecks,
    desc: "Copy a previous quiz and keep working on it.",
    meta: "REUSE CONTENT",
  },
] as const;

export function SetupStep() {
  const router = useRouter();
  const { state, updateInfo, summary, editMode } = useStudio();
  const [choice, setChoice] = useState<
    "scratch" | "ai" | "import" | "duplicate" | null
  >("scratch");

  const info = state.info;
  const marks = summary.totalMarks;
  const fetchedRef = useRef(false);
  const [difficultyOptions, setDifficultyOptions] = useState<{ id: number; heading: string }[]>([]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (!editMode) {
      fetchQuizCode().then((code) => updateInfo({ code })).catch(() => {});
    }
    getQuizDifficultyOptions().then(setDifficultyOptions).catch(() => {});
  }, [editMode]);

  const hasBasicInfo = info.title.trim().length >= 3;

  return (
    <div className="flex flex-col bg-[#F9FAFB] dark:bg-background">
    <div className="">
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      {/* Creation method choice — only on create, not edit */}
      {!editMode && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">How do you want to start?</h2>
            <p className="mt-1 text-xs text-text-secondary">
              You can always use AI tools later inside the editor.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CREATE_CHOICES.map((c) => (
              <ChoiceCard
                key={c.id}
                icon={c.icon}
                label={c.label}
                desc={c.desc}
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
          </div>
        </>
      )}

      {/* Basic information — white card with shadow like image */}
      <div className="rounded-xl bg-white dark:bg-card border border-gray-100 dark:border-border shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none p-6 sm:p-7 space-y-6">
        <div className="border-b border-pink-500/20 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-pink-500">
            Basic Information
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

          {/* Code + Copy */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Quiz Code</label>
            <div className="flex gap-2">
              <input
                value={info.code}
                readOnly
                placeholder="Auto-generated"
                className="h-10 flex-1 rounded-lg border border-gray-200 dark:border-input-border bg-[#F8FAFC] dark:bg-input-bg px-3.5 font-mono text-sm tracking-wider text-text-primary placeholder-text-muted outline-none"
              />
              {info.code && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(info.code);
                    toast.success({ title: "Code copied", description: info.code });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/20 bg-pink-500/5 px-3 py-2 text-xs font-medium text-pink-600 transition-colors duration-150 hover:bg-pink-500/10 hover:text-pink-700"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              )}
            </div>
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

          {/* Exam */}
          <div className="space-y-2">
            <SearchableDropdown
              label="Exam"
              placeholder="Search exams..."
              value={info.exam}
              selectedId={info.examId}
              onSelect={(option) => updateInfo({ exam: option.label, examId: option.id })}
              onClear={() => updateInfo({ exam: "", examId: "" })}
              searchFn={async (query, signal) => {
                const results = await getAllExamCategories(query, signal);
                return results.map((e) => ({ id: e.id, label: e.exam_cat }));
              }}
              minChars={1}
              debounceMs={300}
              maxVisible={8}
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Difficulty</label>
            {difficultyOptions.length === 0 ? (
              <p className="text-[11px] text-text-muted">Loading difficulty options…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {difficultyOptions.map((opt, i) => (
                  <DifficultySelect
                    key={opt.id}
                    value={opt.heading}
                    index={i}
                    selected={
                      info.difficultyId !== "" && info.difficultyId != null
                        ? String(info.difficultyId) === String(opt.id)
                        : info.difficulty.toLowerCase() === opt.heading.toLowerCase()
                    }
                    onSelect={() => {
                      updateInfo({ difficulty: opt.heading, difficultyId: opt.id });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Duration (minutes)</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                min={1}
                max={600}
                value={info.duration || ""}
                onChange={(e) => updateInfo({ duration: Number(e.target.value) })}
                className="h-10 w-full rounded-lg border border-gray-200 dark:border-input-border bg-[#F8FAFC] dark:bg-input-bg pl-10 pr-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
              />
            </div>
          </div>

          {/* Passing Marks */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Passing Marks</label>
            <div className="relative">
              <Award className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                min={0}
                max={marks || undefined}
                value={info.passingMarks || ""}
                placeholder={`Default: ${Math.ceil((marks || 0) * 0.4)}`}
                onChange={(e) => updateInfo({ passingMarks: Number(e.target.value) })}
                className="h-10 w-full rounded-lg border border-gray-200 dark:border-input-border bg-[#F8FAFC] dark:bg-input-bg pl-10 pr-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
              />
            </div>
            <p className="text-[11px] text-text-muted">
              {info.passingMarks
                ? `${info.passingMarks} / ${marks || 0} marks`
                : `Defaults to 40% (${Math.ceil((marks || 0) * 0.4)} marks) if left empty`}
            </p>
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

          {/* Detailed Description */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Detailed Description</label>
            <textarea
              value={info.fullDescription}
              onChange={(e) => updateInfo({ fullDescription: e.target.value.slice(0, 5000) })}
              rows={4}
              maxLength={5000}
              placeholder="Explain what the quiz covers, target audience, pattern..."
              className="w-full rounded-lg border border-gray-200 dark:border-input-border bg-[#F8FAFC] dark:bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
            />
            <p className="text-[11px] text-text-muted text-right">{info.fullDescription.length}/5000</p>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  label,
  desc,
  meta,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  meta: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm transition-all duration-150 ease-out hover:-translate-y-0.5",
        selected
          ? "border-pink-500 bg-white dark:bg-card text-pink-600 shadow-[0_4px_16px_rgba(236,72,153,0.12),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(236,72,153,0.15)]"
          : "border-gray-200 dark:border-border bg-white dark:bg-card shadow-[0_2px_10px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none hover:border-pink-500/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          selected
            ? "bg-violet-50 dark:bg-pink-500/10 text-violet-600 dark:text-pink-500 border border-violet-100 dark:border-pink-500/20"
            : "bg-gray-50 dark:bg-card-hover/40 text-gray-500 dark:text-text-secondary border border-gray-100 dark:border-transparent"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-semibold text-text-primary">{label}</span>
      <p className="text-[11px] leading-snug text-text-secondary">{desc}</p>
      <span className="mt-0.5 inline-flex items-center rounded-md bg-gray-100 dark:bg-pink-500/10 border border-gray-200 dark:border-pink-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-pink-600">
        {meta}
      </span>
    </button>
  );
}

const DIFFICULTY_FALLBACK_COLORS = ["bg-emerald-500", "bg-amber-500", "bg-orange-500", "bg-rose-500"];

const DIFFICULTY_NAMED_COLORS: Record<string, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-orange-500",
  expert: "bg-rose-500",
};

function DifficultySelect({
  value,
  index,
  selected,
  onSelect,
}: {
  value: string;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const color =
    DIFFICULTY_NAMED_COLORS[value.toLowerCase()] ??
    DIFFICULTY_FALLBACK_COLORS[index % DIFFICULTY_FALLBACK_COLORS.length];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold capitalize transition-all",
        selected
          ? cn("border-transparent text-white", color)
          : "border-border bg-card-hover/40 text-text-secondary hover:border-pink-500/20 hover:text-text-primary"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", selected ? "bg-white" : color)} />
      {value}
    </button>
  );
}

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
        className="h-8 min-w-[140px] flex-1 border-none bg-transparent text-xs text-text-primary placeholder-text-muted outline-none"
      />
    </div>
  );
}


