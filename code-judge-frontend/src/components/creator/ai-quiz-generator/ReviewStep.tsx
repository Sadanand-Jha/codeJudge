"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Clock,
  Hash,
  Users,
  Tag,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  Check,
  Trash2,
  Upload,
  X,
  Pencil,
  ListChecks,
  Award,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { Card, Badge } from "@/components/creator/quiz-studio/primitives";
import { EditableField } from "./EditableField";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { ProblemTable } from "./ProblemTable";
import type { AiQuizConfig } from "./types";

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"] as const;

const difficultyColor = {
  Easy: "success" as const,
  Medium: "warning" as const,
  Hard: "rose" as const,
  Expert: "rose" as const,
};

const difficultyDot = {
  Easy: "bg-emerald-500",
  Medium: "bg-amber-500",
  Hard: "bg-orange-500",
  Expert: "bg-rose-500",
};

export function ReviewStep({
  config: initialConfig,
  onProceed,
}: {
  config: AiQuizConfig;
  onProceed: (config: AiQuizConfig) => void;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [problemsExpanded, setProblemsExpanded] = useState(true);
  const thumbRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<AiQuizConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));

  const removeProblem = (id: string) =>
    update({
      problems: config.problems.filter((p) => p.id !== id),
      questionCount: config.problems.filter((p) => p.id !== id).length,
    });

  const editProblemTitle = (id: string, title: string) =>
    update({
      problems: config.problems.map((p) =>
        p.id === id ? { ...p, title } : p
      ),
    });

  const difficultyDistribution = {
    Easy: config.problems.filter((p) => p.difficulty === "Easy").length,
    Medium: config.problems.filter((p) => p.difficulty === "Medium").length,
    Hard: config.problems.filter((p) => p.difficulty === "Hard").length,
  };

  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    update({ thumbnailUrl: url });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
          <Check className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Your Quiz is Ready
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          AI analyzed your problem list and prepared a suggested configuration.
          Review and edit anything below.
        </p>
      </div>

      {/* Quiz Information */}
      <Card
        title="Quiz Information"
        description="AI-generated metadata based on your problem list"
        action={
          <Badge color="accent">
            <Sparkles className="mr-1 h-3 w-3" />
            AI Generated
          </Badge>
        }
      >
        <div className="space-y-5">
          <EditableField
            label="Quiz Title"
            value={config.name}
            onChange={(v) => update({ name: v })}
            confidence={<ConfidenceIndicator level={config.nameConfidence} />}
          />
          <EditableField
            label="Short Description"
            value={config.shortDescription}
            onChange={(v) => update({ shortDescription: v })}
          />
          <EditableField
            label="Detailed Description"
            value={config.description}
            onChange={(v) => update({ description: v })}
            multiline
            confidence={<ConfidenceIndicator level={config.descriptionConfidence} />}
          />
          <EditableField
            label="Instructions"
            value={config.instructions}
            onChange={(v) => update({ instructions: v })}
            multiline
          />
        </div>
      </Card>

      {/* Thumbnail + Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Thumbnail */}
        <Card title="Thumbnail" className="sm:col-span-1">
          <div className="flex flex-col items-center">
            <label className="relative flex h-40 w-full max-w-[180px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/60 text-xs text-text-secondary transition-colors hover:border-violet-500/40 hover:bg-card-hover">
              {config.thumbnailUrl ? (
                <img src={config.thumbnailUrl} alt="thumbnail" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <>
                  <Upload className="mb-1.5 h-5 w-5" />
                  <span>Upload thumbnail</span>
                </>
              )}
              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleThumbUpload}
              />
            </label>
            {config.thumbnailUrl && (
              <button
                type="button"
                onClick={() => update({ thumbnailUrl: "" })}
                className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-rose-500"
              >
                <Trash2 className="mr-1 h-3 w-3" /> Remove
              </button>
            )}
          </div>
        </Card>

        {/* Summary rail */}
        <Card title="Summary" className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
                <ListChecks className="h-3.5 w-3.5" /> Questions
              </div>
              <p className="text-lg font-bold text-text-primary">{config.problems.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
                <Award className="h-3.5 w-3.5" /> Marks
              </div>
              <p className="text-lg font-bold text-text-primary">{config.problems.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
                <Clock className="h-3.5 w-3.5" /> Duration
              </div>
              <p className="text-lg font-bold text-text-primary">{config.duration} min</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
                <Check className="h-3.5 w-3.5" /> Difficulty
              </div>
              <p className="text-lg font-bold text-text-primary">{config.difficulty}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quiz Details */}
      <Card
        title="Quiz Details"
        description="Subject, difficulty, duration, and metadata"
        action={
          <Badge color="accent">
            <Sparkles className="mr-1 h-3 w-3" />
            AI Generated
          </Badge>
        }
      >
        <div className="space-y-5">
          {/* Row 1: Subject + Exam */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditableField
              label="Subject"
              value={config.subject}
              onChange={(v) => update({ subject: v })}
            />
            <EditableField
              label="Exam"
              value={config.exam}
              onChange={(v) => update({ exam: v })}
            />
          </div>

          {/* Row 2: Difficulty selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Difficulty</label>
            <div className="grid grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update({ difficulty: d })}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold capitalize transition-all",
                    config.difficulty === d
                      ? cn("border-transparent text-white", difficultyDot[d])
                      : "border-border bg-card-hover/40 text-text-secondary hover:text-text-primary"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", config.difficulty === d ? "bg-white" : difficultyDot[d])} />
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Duration + Assessment Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Duration (minutes)</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={config.duration}
                  onChange={(e) => update({ duration: Number(e.target.value) })}
                  className="h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
            </div>
            <EditableField
              label="Assessment Type"
              value={config.assessmentType}
              onChange={(v) => update({ assessmentType: v })}
            />
          </div>

          {/* Row 4: Topics + Audience */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditableField
              label="Topics"
              value={config.topics.join(", ")}
              onChange={(v) => update({ topics: v.split(",").map((t) => t.trim()).filter(Boolean) })}
            />
            <EditableField
              label="Suggested Audience"
              value={config.suggestedAudience}
              onChange={(v) => update({ suggestedAudience: v })}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Tags</label>
            <TagInput tags={config.tags} onChange={(tags) => update({ tags })} />
          </div>
        </div>

        {/* Difficulty distribution */}
        <div className="mt-5 rounded-lg border border-border bg-white/[0.02] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Difficulty Distribution
          </p>
          <div className="flex items-center gap-3">
            {Object.entries(difficultyDistribution).map(([level, count]) => (
              <div key={level} className="flex items-center gap-1.5">
                <Badge color={difficultyColor[level as keyof typeof difficultyColor]}>
                  {level}
                </Badge>
                <span className="text-xs font-semibold text-text-primary">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Problems Detected */}
      <Card
        title="Problems Detected"
        description={`${config.problems.length} problems extracted from your document`}
        action={
          <button
            type="button"
            onClick={() => setProblemsExpanded(!problemsExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            {problemsExpanded ? (
              <>Collapse <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>Expand <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        }
      >
        {problemsExpanded ? (
          <ProblemTable
            problems={config.problems}
            onRemove={removeProblem}
            onReorder={(from, to) => {
              const newProblems = [...config.problems];
              const [moved] = newProblems.splice(from, 1);
              newProblems.splice(to, 0, moved);
              update({ problems: newProblems });
            }}
            onEdit={editProblemTitle}
          />
        ) : (
          <p className="text-sm text-text-secondary">
            {config.problems.length} problems detected. Click expand to review.
          </p>
        )}
      </Card>

      {/* CTA */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => onProceed(config)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:brightness-110"
        >
          Create Quiz
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
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
    <div className="flex flex-wrap gap-2 rounded-lg border border-input-border bg-input-bg px-3 py-2.5 min-h-[40px]">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-white/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="rounded p-0.5 hover:text-rose-500"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
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
        className="h-6 min-w-[120px] flex-1 border-none bg-transparent text-xs text-text-primary placeholder-text-muted outline-none"
      />
    </div>
  );
}
