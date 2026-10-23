"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import type { StudioState } from "../types";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { StudioStepHeader, StudioStepLayout } from "../primitives";

interface ReviewItem {
  id: string;
  severity: "error" | "warning" | "ok";
  label: string;
  detail?: string;
  fix?: () => void;
}

export function ReviewStep({ embedded = false }: { embedded?: boolean } = {}) {
  const { state, goToStep, summary } = useStudio();
  const items = computeItems(state, summary, goToStep);

  const errors = items.filter((i) => i.severity === "error");
  const warnings = items.filter((i) => i.severity === "warning");
  const oks = items.filter((i) => i.severity === "ok");

  return (
    <StudioStepLayout embedded={embedded}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <StudioStepHeader title="Review & Validation" />
      </motion.div>

      {errors.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
          <ReviewGroup icon={AlertOctagon} title="Errors" items={errors} color="rose" />
        </motion.div>
      )}
      {warnings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}>
          <ReviewGroup icon={AlertCircle} title="Warnings" items={warnings} color="amber" />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <ReviewGroup icon={CheckCircle2} title="Checks passed" items={oks} color="emerald" />
      </motion.div>
    </StudioStepLayout>
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
    rose: "text-[var(--qs-bad)]",
    amber: "text-[#a85d00]",
    emerald: "text-[var(--qs-ok)]",
  };
  return (
    <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${colorMap[color]}`} />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
          {title} ({items.length})
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const ItemIcon = item.severity === "error" ? AlertOctagon : item.severity === "warning" ? AlertCircle : CheckCircle2;
          return (
            <div
              key={item.id}
              className={cn(
              "flex items-start gap-2.5 rounded-[14px] border-2 p-3",
              item.severity === "error"
                ? "border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
                : item.severity === "warning"
                ? "border-[#a85d00]/40 bg-[#fff3d6] text-[#a85d00]"
                : "border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
              )}
            >
            <ItemIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">
                {item.label}
              </p>
              {item.detail && (
                <p className="mt-0.5 text-[10px] font-medium opacity-80">
                  {item.detail}
                </p>
              )}
            </div>
            {item.fix && (
              <button
                type="button"
                onClick={item.fix}
                className="shrink-0 rounded-[10px] border-2 border-current px-3 py-1.5 text-[11px] font-extrabold transition-colors hover:opacity-80"
              >
                Fix
              </button>
            )}
            </div>
          );
        })}
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
      fix: () => goToStep("details"),
    });
  } else {
    items.push({ id: "title", severity: "ok", label: "Quiz title is set" });
  }

  if (!state.info.shortDescription) {
    items.push({
      id: "desc",
      severity: "warning",
      label: "Short description is missing",
      fix: () => goToStep("details"),
    });
  } else {
    items.push({ id: "desc", severity: "ok", label: "Short description is set" });
  }

  if (state.info.duration <= 0) {
    items.push({
      id: "duration",
      severity: "error",
      label: "Duration must be greater than 0",
      fix: () => goToStep("rules"),
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
        fix: () => goToStep("access"),
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
      fix: () => goToStep("access"),
    });
  } else {
    items.push({
      id: "reg-fields",
      severity: "ok",
      label: `${regFields.length} registration field(s) configured`,
    });
  }

  if (regFields.some((f) => !f.name.trim())) {
    items.push({
      id: "reg-field-names",
      severity: "error",
      label: "Some registration fields have no name",
      detail: "Every registration field needs a name before saving.",
      fix: () => goToStep("access"),
    });
  }

  const deadline = state.registration?.settings.deadline;
  if (deadline && new Date(deadline).getTime() < Date.now()) {
    items.push({
      id: "reg-deadline",
      severity: "warning",
      label: "Registration deadline is in the past",
      detail: "Students will not be able to register unless the deadline is extended.",
      fix: () => goToStep("access"),
    });
  }

  if (state.pricing.mode === "paid" && state.pricing.price <= 0) {
    items.push({
      id: "price",
      severity: "error",
      label: "Paid quiz requires a price",
      fix: () => goToStep("access"),
    });
  }

  return items;
}
