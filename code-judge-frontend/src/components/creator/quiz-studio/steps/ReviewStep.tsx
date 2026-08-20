"use client";

import { AlertCircle, CheckCircle2, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import type { StudioState } from "../types";
import { getQuestionStatus } from "@/components/quiz/creator/types";

interface ReviewItem {
  id: string;
  severity: "error" | "warning" | "ok";
  label: string;
  detail?: string;
  fix?: () => void;
}

export function ReviewStep() {
  const { state, goToStep, summary } = useStudio();
  const items = computeItems(state, summary, goToStep);

  const errors = items.filter((i) => i.severity === "error");
  const warnings = items.filter((i) => i.severity === "warning");
  const oks = items.filter((i) => i.severity === "ok");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
      <div>
        <h2 className="text-lg font-extrabold text-text-primary">Review & Validation</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Publishing is blocked until all errors are resolved. Warnings will not
          prevent publishing but are recommended to fix.
        </p>
      </div>

      {errors.length > 0 && (
        <ReviewGroup icon={AlertOctagon} title="Errors" items={errors} color="rose" />
      )}
      {warnings.length > 0 && (
        <ReviewGroup icon={AlertCircle} title="Warnings" items={warnings} color="amber" />
      )}

      <ReviewGroup icon={CheckCircle2} title="Checks passed" items={oks} color="emerald" />
    </div>
  );
}

function ReviewGroup({
  icon: Icon,
  title,
  items,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: ReviewItem[];
  color: "rose" | "amber" | "emerald";
}) {
  const colorMap = {
    rose: "text-rose-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${colorMap[color]}`} />
        <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
          {title} ({items.length})
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-2.5",
              item.severity === "error"
                ? "border-rose-500/20 bg-rose-500/5"
                : item.severity === "warning"
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-emerald-500/20 bg-emerald-500/5"
            )}
          >
            <div className="mt-0.25 h-4 w-4 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xs font-semibold",
                  item.severity === "error"
                    ? "text-rose-500"
                    : item.severity === "warning"
                    ? "text-amber-500"
                    : "text-emerald-500"
                )}
              >
                {item.label}
              </p>
              {item.detail && (
                <p className="mt-0.5 text-[10px] text-text-secondary">
                  {item.detail}
                </p>
              )}
            </div>
            {item.fix && (
              <button
                type="button"
                onClick={item.fix}
                className="shrink-0 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-text-secondary hover:text-text-primary"
              >
                Fix
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function computeItems(
  state: StudioState,
  summary: { questionCount: number; validQuestions: number; incompleteQuestions: number },
  goToStep: (id: StudioState["step"]) => void
): ReviewItem[] {
  const items: ReviewItem[] = [];

  if (state.info.title.trim().length < 3) {
    items.push({
      id: "title",
      severity: "error",
      label: "Quiz title is required",
      detail: "Add at least 3 characters.",
      fix: () => goToStep("setup"),
    });
  } else {
    items.push({ id: "title", severity: "ok", label: "Quiz title is set" });
  }

  if (!state.info.shortDescription) {
    items.push({
      id: "desc",
      severity: "warning",
      label: "Short description is missing",
      fix: () => goToStep("setup"),
    });
  } else {
    items.push({ id: "desc", severity: "ok", label: "Short description is set" });
  }

  if (!state.info.thumbnailUrl) {
    items.push({
      id: "thumb",
      severity: "warning",
      label: "Thumbnail not uploaded",
      fix: () => goToStep("branding"),
    });
  }

  if (state.info.duration <= 0) {
    items.push({
      id: "duration",
      severity: "error",
      label: "Duration must be greater than 0",
      fix: () => goToStep("setup"),
    });
  } else {
    items.push({ id: "duration", severity: "ok", label: `${state.info.duration} minutes set` });
  }

  if (summary.questionCount === 0) {
    items.push({
      id: "qcount",
      severity: "error",
      label: "No questions added",
      detail: "Add at least one question before publishing.",
      fix: () => goToStep("questions"),
    });
  } else if (summary.incompleteQuestions > 0) {
    items.push({
      id: "incomplete",
      severity: "error",
      label:
        summary.incompleteQuestions + " question(s) are incomplete",
      detail: "Each must have a stem and a correct answer.",
      fix: () => goToStep("questions"),
    });
  } else {
    items.push({ id: "qcount", severity: "ok", label: summary.questionCount + " valid questions" });
  }

  const incompleteMarks = state.questions.filter((q) => (q.marks || 0) <= 0);
  if (incompleteMarks.length > 0) {
    items.push({
      id: "marks",
      severity: "error",
      label: incompleteMarks.length + " question(s) have no marks",
      fix: () => goToStep("questions"),
    });
  }

  const incompleteExplanations = state.questions.filter((q) => !q.explanation);
  if (incompleteExplanations.length > 0) {
    items.push({
      id: "explanations",
      severity: "warning",
      label:
        incompleteExplanations.length + " question(s) have no explanation",
      fix: () => goToStep("questions"),
    });
  }

  if (state.settings.attemptLimit < 1) {
    items.push({
      id: "attempts",
      severity: "error",
      label: "Attempt limit must be at least 1",
      fix: () => goToStep("settings"),
    });
  }

  if (state.audience.mode !== "public" && !state.audience.accessCodeEnabled) {
    items.push({
      id: "secret",
      severity: "warning",
      label: "Private quiz has no access code",
      fix: () => goToStep("audience"),
    });
  }

  if (state.pricing.mode === "paid" && state.pricing.price <= 0) {
    items.push({
      id: "price",
      severity: "error",
      label: "Paid quiz requires a price",
      fix: () => goToStep("settings"),
    });
  }

  if (!state.branding.creatorName) {
    items.push({
      id: "creator",
      severity: "warning",
      label: "Creator name not set",
      fix: () => goToStep("branding"),
    });
  }

  return items;
}
