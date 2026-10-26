"use client";

import { useEffect, useState } from "react";
import { Eye, Save } from "lucide-react";
import { StudioStepHeader, StudioStepLayout } from "../primitives";
import { TimingSection } from "../components/timing";
import { useStudio } from "../StudioProvider";
import { QuizPreviewPlayer } from "../components/QuizPreviewPlayer";
import { QuizCodeCard } from "./SettingsStep";
import { QuizSummaryCard } from "../components/QuizSummaryCard";
import { PublishStep } from "./PublishStep";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";

export function ReviewPublishStep({ onPublish }: { onPublish: () => void }) {
  const { editMode, state } = useStudio();
  const [previewOpen, setPreviewOpen] = useState(false);
  const toast = useToast();
  const problems = useQuizProblemsStore((s) => s.problems);
  const hydrateProblems = useQuizProblemsStore((s) => s.hydrate);

  useEffect(() => {
    hydrateProblems();
  }, [hydrateProblems]);

  const previewQuestions = problems.length > 0 ? problems : state.questions;

  const handlePreview = () => {
    if (previewQuestions.length === 0) {
      toast.error({
        title: "No questions to preview",
        description: "Add questions on the Problems page first, then try the preview again.",
      });
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title={editMode ? "Review & save" : "Publish"} />
      <QuizCodeCard />

      <section className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
              <Eye className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">Preview as a student</h2>
              <p className="mt-0.5 text-xs font-medium leading-5 text-[var(--qs-muted)]">
                See the exact student quiz design and flow — no exam mode, timer or monitoring.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-extrabold text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            <Eye className="h-4 w-4" /> Preview quiz
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
          <div className="border-b-2 border-[var(--qs-line)] px-5 py-4 sm:px-6 sm:py-5">
            <h2 className="text-base font-extrabold text-[var(--qs-ink)]">
              {editMode ? "Availability & save" : "Availability & publish"}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
              {editMode
                ? "Adjust when this quiz runs, then save your changes."
                : "Choose when this quiz runs, then start or schedule it."}
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <TimingSection variant="availability" allowInlineStart={editMode} flat />

            <div className="mt-6 overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                    <Save className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">
                      {editMode ? "Ready to save?" : "Ready to publish?"}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">
                      {editMode
                        ? "Review the final details, then save your changes."
                        : "Review the final details before publishing."}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border-2 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em]",
                    state.info.quizLifecycle === "live" && "border-[var(--qs-ink)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
                    state.info.quizLifecycle === "scheduled" && "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]",
                    state.info.quizLifecycle === "ended" && "border-[var(--qs-ink)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]",
                    state.info.quizLifecycle === "draft" && "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]"
                  )}
                >
                  {state.info.quizLifecycle}
                </span>
              </div>
              <div className="p-4">
                <PublishStep onPublish={onPublish} embedded bare />
              </div>
            </div>
          </div>
        </section>

        <QuizSummaryCard className="lg:sticky lg:top-4" />
      </div>

      <QuizPreviewPlayer
        key={previewOpen ? "preview-open" : "preview-closed"}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        questions={previewQuestions}
        quizTitle={state.info.title}
      />
    </StudioStepLayout>
  );
}
