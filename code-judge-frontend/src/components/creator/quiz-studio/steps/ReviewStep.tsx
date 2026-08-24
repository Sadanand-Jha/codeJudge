"use client";

import { AlertCircle, CheckCircle2, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import type { StudioState } from "../types";
import { getRegistrationFieldDef } from "../types";
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
    <div className="flex flex-col bg-background">
    <div className="">
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Review & Validation</h2>
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
    </div>
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${colorMap[color]}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
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

  // ── Audience ──
  if (state.audience.mode === "classroom") {
    const roomCount = (state.audience.roomIds ?? []).length;
    const manualCount = (state.audience.invitedEmails ?? []).length;
    if (roomCount === 0 && manualCount === 0) {
      items.push({
        id: "audience-empty",
        severity: "error",
        label: "No audience selected",
        detail: "Select at least one room or manually add students.",
        fix: () => goToStep("audience"),
      });
    } else {
      items.push({
        id: "audience-ok",
        severity: "ok",
        label:
          roomCount > 0 && manualCount > 0
            ? `${roomCount} room(s) + ${manualCount} manually added student(s)`
            : roomCount > 0
            ? `${roomCount} room(s) selected`
            : `${manualCount} manually added student(s)`,
      });
    }
  }

  // ── Registration ──
  const regFields = state.registration?.fields ?? [];
  if (regFields.length === 0) {
    items.push({
      id: "reg-fields",
      severity: "warning",
      label: "No registration fields configured",
      detail: "Add academic fields like Roll Number or Branch for participant records.",
      fix: () => goToStep("registration"),
    });
  } else {
    items.push({
      id: "reg-fields",
      severity: "ok",
      label: `${regFields.length} registration field(s) configured`,
    });
  }

  const emptySelectField = regFields.find((f) => {
    const def = getRegistrationFieldDef(f.key);
    return def?.inputType === "select" && (!f.options || f.options.length === 0);
  });
  if (emptySelectField) {
    items.push({
      id: "reg-options",
      severity: "error",
      label: `Registration field "${getRegistrationFieldDef(emptySelectField.key)?.label}" has no options`,
      detail: "Add at least one option for select fields.",
      fix: () => goToStep("registration"),
    });
  }

  const deadline = state.registration?.settings.deadline;
  if (deadline && new Date(deadline).getTime() < Date.now()) {
    items.push({
      id: "reg-deadline",
      severity: "warning",
      label: "Registration deadline is in the past",
      detail: "Students will not be able to register unless the deadline is extended.",
      fix: () => goToStep("registration"),
    });
  }

  if (state.pricing.mode === "paid" && state.pricing.price <= 0) {
    items.push({
      id: "price",
      severity: "error",
      label: "Paid quiz requires a price",
      fix: () => goToStep("pricing"),
    });
  }

  return items;
}
