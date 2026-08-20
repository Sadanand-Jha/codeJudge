"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  Upload,
  X,
  Trash2,
  Check,
  Clock,
  ListChecks,
  Award,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import {
  EXAMS,
  LANGUAGES,
  type CreatorQuestionType,
} from "../types";
import { toast } from "@/lib/toast";
import { GhostButton, Badge } from "../primitives";

const CREATE_CHOICES = [
  {
    id: "scratch",
    label: "From Scratch",
    icon: FileText,
    desc: "Start with an empty canvas and build manually.",
    meta: "Full control",
  },
  {
    id: "ai",
    label: "AI Generate",
    icon: Sparkles,
    desc: "Generate questions from a topic, PDF, or document.",
    meta: "AI assistance",
  },
  {
    id: "import",
    label: "Import Existing Quiz",
    icon: Upload,
    desc: "Bring in a quiz from a file (ZIP, CSV, Excel, PDF).",
    meta: "Bulk import",
  },
  {
    id: "duplicate",
    label: "Duplicate Existing Quiz",
    icon: ListChecks,
    desc: "Copy a previous quiz and keep working on it.",
    meta: "Reuse content",
  },
] as const;

export function SetupStep() {
  const { state, updateInfo, addQuestion, summary } = useStudio();
  const [choice, setChoice] = useState<
    "scratch" | "ai" | "import" | "duplicate" | null
  >("scratch");
  const [showAi, setShowAi] = useState(false);

  const info = state.info;
  const marks = summary.totalMarks;

  const handleThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateInfo({ thumbnailUrl: url });
  };

  const removeThumbnail = () => updateInfo({ thumbnailUrl: "" });

  const onAiGenerate = useCallback(() => {
    setShowAi(true);
  }, []);

  const confirmAi = (topic: string, count: number, qtype: CreatorQuestionType) => {
    setShowAi(false);
    toast.success({
      title: "Questions generated",
      description: `Added ${count} ${qtype.replace("_", " ")} question(s) on "${topic}".`,
    });
    for (let i = 0; i < count; i++) {
      addQuestion();
    }
  };

  const hasBasicInfo = info.title.trim().length >= 3;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      {/* Creation method choice */}
      <div>
        <h2 className="text-lg font-extrabold text-text-primary">How do you want to start?</h2>
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
                setChoice("ai");
                onAiGenerate();
              } else {
                setChoice(c.id);
                setShowAi(false);
              }
            }}
          />
        ))}
      </div>

      {showAi && <AiGeneratePanel onConfirm={confirmAi} />}

      {/* Basic information */}
      <div className="space-y-6">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          Quiz Information
        </h3>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-secondary">Quiz Title</label>
              <input
                value={info.title}
                onChange={(e) => updateInfo({ title: e.target.value })}
                placeholder="e.g. JEE Main 2026 Mock Test 01"
                className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-secondary">Short Description</label>
              <textarea
                value={info.shortDescription}
                onChange={(e) => updateInfo({ shortDescription: e.target.value })}
                rows={2}
                placeholder="A concise summary shown in listings."
                className="w-full rounded-xl border border-input-border bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-secondary">Detailed Description</label>
              <textarea
                value={info.fullDescription}
                onChange={(e) => updateInfo({ fullDescription: e.target.value })}
                rows={4}
                placeholder="Explain what the quiz covers, target audience, pattern..."
                className="w-full rounded-xl border border-input-border bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">Subject</label>
                <input
                  value={info.subject}
                  onChange={(e) => updateInfo({ subject: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">Category</label>
                <input
                  value={info.category}
                  onChange={(e) => updateInfo({ category: e.target.value })}
                  placeholder="e.g. Engineering"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">Exam</label>
                <select
                  value={info.exam}
                  onChange={(e) => updateInfo({ exam: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
                >
                  <option value="">Select exam</option>
                  {EXAMS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">Class / Grade</label>
                <input
                  value={info.classGrade}
                  onChange={(e) => updateInfo({ classGrade: e.target.value })}
                  placeholder="e.g. 12th, B.Tech Sem 5"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">Difficulty</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Easy", "Medium", "Hard", "Expert"] as const).map((d) => (
                    <DifficultySelect
                      key={d}
                      value={d}
                      selected={info.difficulty === d}
                      onSelect={() => updateInfo({ difficulty: d })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">Language</label>
                <select
                  value={info.language}
                  onChange={(e) => updateInfo({ language: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-xs font-bold text-text-secondary">Tags</label>
                <TagInput tags={info.tags} onChange={(tags) => updateInfo({ tags })} />
              </div>
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
                    className="h-11 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnail + summary rail */}
          <div className="flex flex-col gap-5">
            <ThumbnailUploader
              url={info.thumbnailUrl}
              onUpload={handleThumbnail}
              onRemove={removeThumbnail}
            />
            <SummaryRail
              questionCount={summary.questionCount}
              totalMarks={marks}
              duration={info.duration}
              completed={summary.validQuestions}
              status={hasBasicInfo ? "ok" : "incomplete"}
            />
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
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-sm transition-all",
        selected
          ? "border-pink-500/40 bg-pink-500/6 text-pink-600 dark:text-pink-400"
          : "border-border bg-card hover:border-border-hover hover:bg-white/[0.03]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          selected
            ? "bg-pink-500/12 text-pink-500"
            : "bg-white/[0.04] text-text-secondary"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-semibold text-text-primary">{label}</span>
      <p className="text-[11px] text-text-secondary">{desc}</p>
      <Badge color="purple" className="mt-0.5">
        {meta}
      </Badge>
    </motion.button>
  );
}

function DifficultySelect({
  value,
  selected,
  onSelect,
}: {
  value: "Easy" | "Medium" | "Hard" | "Expert";
  selected: boolean;
  onSelect: () => void;
}) {
  const color = {
    Easy: "bg-emerald-500",
    Medium: "bg-amber-500",
    Hard: "bg-orange-500",
    Expert: "bg-rose-500",
  }[value];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold capitalize transition-all",
        selected
          ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white"
          : "border-border bg-white/[0.02] text-text-secondary hover:text-text-primary"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", color)} />
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

function ThumbnailUploader({
  url,
  onUpload,
  onRemove,
}: {
  url: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <label className="relative flex h-40 w-full max-w-[180px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/60 text-xs text-text-secondary transition-colors hover:border-pink-500/40 hover:bg-white/[0.03]">
        {url ? (
          <img src={url} alt="thumbnail" className="h-full w-full rounded-xl object-cover" />
        ) : (
          <>
            <Upload className="mb-1.5 h-5 w-5" />
            <span>Upload thumbnail</span>
          </>
        )}
        <input type="file" accept="image/*" hidden onChange={onUpload} />
      </label>
      {url && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-rose-500"
        >
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      )}
    </div>
  );
}

function SummaryRail({
  questionCount,
  totalMarks,
  duration,
  completed,
  status,
}: {
  questionCount: number;
  totalMarks: number;
  duration: number;
  completed: number;
  status: "ok" | "incomplete";
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
            <ListChecks className="h-3.5 w-3.5" /> Questions
          </div>
          <p className="text-lg font-bold text-text-primary">{questionCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
            <Award className="h-3.5 w-3.5" /> Marks
          </div>
          <p className="text-lg font-bold text-text-primary">{totalMarks}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
            <Clock className="h-3.5 w-3.5" /> Duration
          </div>
          <p className="text-lg font-bold text-text-primary">{duration || 0} min</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
            <Check className="h-3.5 w-3.5" /> Complete
          </div>
          <p className="text-lg font-bold text-text-primary">
            {completed}/{questionCount}
          </p>
        </div>
      </div>
      {status === "incomplete" && (
        <p className="text-[11px] font-semibold text-amber-500">
          Complete the quiz title to continue to the next step.
        </p>
      )}
    </div>
  );
}

function AiGeneratePanel({
  onConfirm,
}: {
  onConfirm: (topic: string, count: number, type: CreatorQuestionType) => void;
}) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [type, setType] = useState<CreatorQuestionType>("single_choice");
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl border border-pink-500/30 bg-pink-500/5 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-pink-500" />
        <span className="text-sm font-bold text-text-primary">AI Generate Questions</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic, e.g. Electrostatics"
          className="h-10 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50"
        />
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="h-10 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none focus:border-pink-500/50"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CreatorQuestionType)}
          className="h-10 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none focus:border-pink-500/50"
        >
          <option value="single_choice">MCQ</option>
          <option value="multiple_choice">Multiple Select</option>
          <option value="true_false">True/False</option>
          <option value="text">Short Answer</option>
        </select>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <GhostButton onClick={() => {}}>Generate (simulated)</GhostButton>
      </div>
    </motion.div>
  );
}
