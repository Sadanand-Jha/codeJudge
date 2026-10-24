"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { StudioStepHeader, StudioStepLayout } from "../primitives";
import { TimingSection } from "../components/timing";
import { useStudio } from "../StudioProvider";
import { QuizPreviewPlayer } from "../components/QuizPreviewPlayer";
import { QuizCodeCard } from "./SettingsStep";
import { PublishStep } from "./PublishStep";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import { useToast } from "@/hooks/useToast";

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
          <TimingSection variant="availability" allowInlineStart={false} flat />

          <div className="mt-6 border-t-2 border-[var(--qs-line)] pt-5">
            <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">
              {editMode ? "Ready to save?" : "Ready to publish?"}
            </h3>
            <div className="mt-3">
              <PublishStep onPublish={onPublish} embedded bare />
            </div>
          </div>
        </div>
      </section>

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
