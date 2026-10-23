"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  Check,
  Trash2,
  Upload,
  X,
  ListChecks,
  Award,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { EditableField } from "./EditableField";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { ProblemTable } from "./ProblemTable";
import type { AiQuizConfig } from "./types";

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"] as const;

const difficultyDot = {
  Easy: "bg-[var(--qs-ok)]",
  Medium: "bg-[#a85d00]",
  Hard: "bg-[var(--qs-bad)]",
  Expert: "bg-[var(--qs-ink)]",
};

const distributionColor: Record<string, string> = {
  Easy: "border-[var(--qs-ok)]/25 bg-[var(--qs-ok)]/10 text-[var(--qs-ok)]",
  Medium: "border-[#a85d00]/25 bg-[#a85d00]/10 text-[#a85d00]",
  Hard: "border-[var(--qs-bad)]/25 bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]",
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
    <div className="mx-auto max-w-6xl space-y-4 py-4 pb-8 sm:space-y-6 sm:py-8">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] text-white shadow-[4px_4px_0_var(--qs-sun)] sm:mb-4 sm:h-14 sm:w-14">
          <Check className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
          Your Quiz is Ready
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-[var(--qs-muted)]">
          Your quiz is ready to review.
          Review and edit anything below.
        </p>
        <div className="mx-auto mt-3 flex max-w-xl items-start gap-2 rounded-[14px] border-2 border-[#a85d00]/25 bg-[var(--qs-sun)]/20 px-3 py-2 text-left">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a85d00]" />
          <p className="text-xs leading-5 text-[var(--qs-ink)]/80">
            AI can make mistakes — please review every question before it goes live.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-3">
          <Panel
            title="Quiz Information"
            description="Check and edit the quiz details"
            action={<AiBadge />}
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
          </Panel>

          <Panel
            title="Quiz Details"
            description="Subject, difficulty, and metadata"
            action={<AiBadge />}
          >
            <div className="space-y-5">
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

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Difficulty</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => update({ difficulty: d })}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-[12px] border-2 px-2 py-2 text-[11px] font-extrabold capitalize transition-colors sm:px-3 sm:text-xs",
                        config.difficulty === d
                          ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                      )}
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", config.difficulty === d ? "bg-[var(--qs-sun)]" : difficultyDot[d])} />
                      <span className="truncate">{d}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EditableField
                  label="Assessment Type"
                  value={config.assessmentType}
                  onChange={(v) => update({ assessmentType: v })}
                />
              </div>

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

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Tags</label>
                <TagInput tags={config.tags} onChange={(tags) => update({ tags })} />
              </div>
            </div>

            <div className="mt-5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Difficulty Distribution
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {Object.entries(difficultyDistribution).map(([level, count]) => (
                  <div key={level} className="flex items-center gap-1.5">
                    <span className={cn("rounded-full border-2 px-2 py-0.5 text-[10px] font-extrabold", distributionColor[level])}>
                      {level}
                    </span>
                    <span className="text-xs font-extrabold text-[var(--qs-ink)]">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="Problems Detected"
            description={`${config.problems.length} questions ready to review`}
            action={
              <button
                type="button"
                onClick={() => setProblemsExpanded(!problemsExpanded)}
                className="flex items-center gap-1 rounded-[10px] border-2 border-[var(--qs-line)] px-2.5 py-1 text-xs font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)]"
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
              <p className="text-sm text-[var(--qs-muted)]">
                {config.problems.length} problems detected. Click expand to review.
              </p>
            )}
          </Panel>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-32">
            <Panel title="Summary">
              <div className="grid grid-cols-2 gap-1.5 text-center sm:gap-2">
                <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[var(--qs-muted)] sm:text-xs">
                    <ListChecks className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> <span className="truncate">Questions</span>
                  </div>
                  <p className="text-base font-extrabold text-[var(--qs-ink)] sm:text-lg">{config.problems.length}</p>
                </div>
                <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[var(--qs-muted)] sm:text-xs">
                    <Award className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> <span className="truncate">Marks</span>
                  </div>
                  <p className="text-base font-extrabold text-[var(--qs-ink)] sm:text-lg">{config.problems.length}</p>
                </div>
                <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[var(--qs-muted)] sm:text-xs">
                    <Check className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> <span className="truncate">Difficulty</span>
                  </div>
                  <p className="truncate text-base font-extrabold text-[var(--qs-ink)] sm:text-lg">{config.difficulty}</p>
                </div>
              </div>
            </Panel>

            <Panel title="Thumbnail">
              <div className="flex flex-col items-center">
                <label className="relative flex h-32 w-full max-w-[220px] cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-center text-xs font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:bg-[var(--qs-brand)]/[0.04] sm:h-40">
                  {config.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- locally-created blob preview
                    <img src={config.thumbnailUrl} alt="thumbnail" className="h-full w-full rounded-[12px] object-cover" />
                  ) : (
                    <>
                      <Upload className="mb-1 h-5 w-5 shrink-0" />
                      <span className="text-[11px] sm:text-xs">Upload thumbnail</span>
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
                    className="mt-2 inline-flex items-center gap-1 rounded-[10px] border-2 border-[var(--qs-line)] px-3 py-1.5 text-xs font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-bad)] hover:text-[var(--qs-bad)]"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <div className="mobile-viewport-actions sticky bottom-0 z-10 -mx-4 flex border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pt-2 sm:backdrop-blur-none">
        <button
          type="button"
          onClick={() => onProceed(config)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-6 py-3 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition hover:brightness-105 sm:w-auto"
        >
          Create Quiz
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AiBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-brand)]/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
      <Sparkles className="h-3 w-3" />
      AI Generated
    </span>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold tracking-tight text-[var(--qs-ink)]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
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
    <div className="flex min-h-[40px] flex-wrap gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 transition focus-within:border-[var(--qs-brand)]">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--qs-ink)]">
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="rounded p-0.5 transition-colors hover:text-[var(--qs-bad)]"
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
        className="h-6 min-w-[120px] flex-1 border-none bg-transparent text-xs text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] outline-none"
      />
    </div>
  );
}
