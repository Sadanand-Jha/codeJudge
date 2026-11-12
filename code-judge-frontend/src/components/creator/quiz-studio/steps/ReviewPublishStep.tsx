"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Copy, Eye, Loader2, RefreshCw, Save } from "lucide-react";
import { StudioStepHeader, StudioStepLayout } from "../primitives";
import { TimingSection } from "../components/timing";
import { isQuestionValidationError, useStudio } from "../StudioProvider";
import { QuizPreviewPlayer } from "../components/QuizPreviewPlayer";
import { QuizCodeCard } from "./SettingsStep";
import { QuizSummaryCard } from "../components/QuizSummaryCard";
import { PublishStep } from "./PublishStep";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import { useToast } from "@/hooks/useToast";
import { regenerateQuizCode } from "@/services/quiz";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";

export function ReviewPublishStep({ onPublish }: { onPublish: () => void }) {
  const router = useRouter();
  const {
    editMode,
    state,
    summary,
    goToStep,
    saveToServer,
    savingToServer,
    updateInfo,
  } = useStudio();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savingAction, setSavingAction] = useState<"draft" | "exit" | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSnapshotRef = useRef<string | null>(null);
  const toast = useToast();
  const problems = useQuizProblemsStore((s) => s.problems);
  const hydrateProblems = useQuizProblemsStore((s) => s.hydrate);

  useEffect(() => {
    hydrateProblems();
  }, [hydrateProblems]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const mobileSnapshot = JSON.stringify({
    startDate: state.info.startDate,
    endDate: state.info.endDate,
    quizLifecycle: state.info.quizLifecycle,
    code: state.info.code,
  });

  useEffect(() => {
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = mobileSnapshot;
      return;
    }
    setDirty(mobileSnapshot !== savedSnapshotRef.current);
  }, [mobileSnapshot]);

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

  const saveMobile = async (mode: "draft" | "exit") => {
    if (savingAction || savingToServer) return;
    setSavingAction(mode);
    try {
      await saveToServer();
      savedSnapshotRef.current = mobileSnapshot;
      setDirty(false);
      toast.success({
        title: state.info.title || "Quiz saved",
        description:
          mode === "exit"
            ? "Your changes have been saved. Taking you to My Quizzes…"
            : "Your changes have been saved.",
      });
      if (mode === "exit") router.push("/creator/quizzes");
    } catch (err) {
      if (!isQuestionValidationError(err)) {
        toast.error({
          title: "Could not save quiz",
          description: getApiErrorMessage(err, "Something went wrong. Please try again."),
        });
      }
    } finally {
      setSavingAction(null);
    }
  };

  const copyCode = async () => {
    if (!state.info.code) return;
    try {
      await navigator.clipboard.writeText(state.info.code);
      setCopiedCode(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedCode(false), 1600);
      toast.success({ title: "Quiz code copied", description: state.info.code });
    } catch {
      toast.error({
        title: "Could not copy code",
        description: "Copy it manually from the box.",
      });
    }
  };

  const generateCode = async () => {
    if (!state.serverQuizId || generatingCode) return;
    setGeneratingCode(true);
    try {
      const nextCode = await regenerateQuizCode(state.serverQuizId);
      updateInfo({ code: nextCode });
      toast.success({
        title: "New quiz code generated",
        description: "The previous code has stopped working.",
      });
    } catch {
      toast.error({
        title: "Could not generate a new code",
        description: "Please try again in a moment.",
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  const audience =
    state.audience.mode === "classroom"
      ? "Rooms"
      : state.audience.mode === "private"
        ? "Private"
        : "Anyone";
  const price = state.pricing.mode === "paid" ? `₹${state.pricing.price}` : "Free";
  const responseWindow =
    state.info.quizLifecycle === "scheduled"
      ? "Open during the scheduled window"
      : "Open until you end the quiz";
  const negativeMarking = state.settings.negativeMarking
    ? `On (${state.settings.negativeMarkValue})`
    : "Off";
  const mobileSaving = savingAction !== null || savingToServer;

  return (
    <StudioStepLayout width="wide">
      {editMode && (
        <div className="pb-32 lg:hidden">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] font-extrabold leading-[1.2] text-[var(--qs-ink)]">
                Review &amp; save
              </h1>
              <p className="mt-1 text-[15px] font-medium leading-[1.45] text-[var(--qs-muted)]">
                Check the details, set when the quiz runs, then save.
              </p>
            </div>
            <span
              role="status"
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-extrabold",
                dirty
                  ? "bg-[var(--qs-warnbg)] text-[var(--qs-warn)]"
                  : "bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
              )}
            >
              <span className="h-[7px] w-[7px] rounded-full bg-current" />
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
          </div>

          <section className="mt-4 rounded-[20px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-[18px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-extrabold leading-[1.3] text-[var(--qs-ink)]">
                Quiz details
              </h2>
              <button
                type="button"
                onClick={() => goToStep("details")}
                className="my-[-8px] mr-[-4px] flex h-11 items-center gap-1 pr-1 text-[15px] font-extrabold text-[var(--qs-brand)]"
              >
                Edit <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-2">
              <div className="flex items-start justify-between gap-4 py-3 text-[15px]">
                <dt className="shrink-0 font-semibold text-[var(--qs-muted)]">Status</dt>
                <dd className="m-0 text-right font-bold text-[var(--qs-ink)]">
                  <span className="inline-block rounded-[8px] bg-[var(--qs-poly-1)] px-2.5 py-[3px] text-[12px] font-extrabold tracking-[0.05em] text-[var(--qs-brand)]">
                    {state.info.quizLifecycle.toUpperCase()}
                  </span>
                </dd>
              </div>
              {[
                { label: "Title", value: state.info.title || "Untitled Quiz" },
                { label: "Questions", value: String(summary.questionCount) },
                { label: "Response time", value: responseWindow },
                { label: "Negative marking", value: negativeMarking },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-4 border-t border-[var(--qs-line)] py-3 text-[15px]"
                >
                  <dt className="shrink-0 font-semibold text-[var(--qs-muted)]">{row.label}</dt>
                  <dd className="m-0 break-words text-right font-bold text-[var(--qs-ink)]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-4 rounded-[20px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-[18px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-extrabold leading-[1.3] text-[var(--qs-ink)]">
                Access &amp; pricing
              </h2>
              <button
                type="button"
                onClick={() => goToStep("access")}
                className="my-[-8px] mr-[-4px] flex h-11 items-center gap-1 pr-1 text-[15px] font-extrabold text-[var(--qs-brand)]"
              >
                Edit <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-2">
              {[
                { label: "Audience", value: audience },
                { label: "Price", value: price },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-4 border-t border-[var(--qs-line)] py-3 text-[15px] first:border-t-0"
                >
                  <dt className="shrink-0 font-semibold text-[var(--qs-muted)]">{row.label}</dt>
                  <dd className="m-0 break-words text-right font-bold text-[var(--qs-ink)]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-4 rounded-[20px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-[18px]">
            <h2 className="text-[17px] font-extrabold leading-[1.3] text-[var(--qs-ink)]">
              Quiz code
            </h2>
            <p className="mt-1 text-[14px] font-medium leading-[1.5] text-[var(--qs-muted)]">
              Students use this code to join your quiz.
            </p>
            <div className="mt-3.5 flex min-h-14 items-center justify-between gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] py-1.5 pl-4 pr-1.5">
              <code
                className={cn(
                  "break-all font-mono text-[18px] font-extrabold tracking-[0.08em] text-[var(--qs-ink)]",
                  !state.info.code &&
                    "font-sans text-[15px] font-semibold tracking-normal text-[var(--qs-muted)]"
                )}
              >
                {state.info.code || "Not generated yet"}
              </code>
              <button
                type="button"
                onClick={() => void copyCode()}
                disabled={!state.info.code}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-[12px] border-[1.5px] border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-[14px] font-extrabold text-[var(--qs-ink)] disabled:opacity-45"
              >
                {copiedCode ? <Check className="h-[18px] w-[18px] text-[var(--qs-ok)]" /> : <Copy className="h-[18px] w-[18px]" />}
                {copiedCode ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void generateCode()}
              disabled={!state.serverQuizId || generatingCode}
              className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[var(--qs-ink)] text-[15px] font-extrabold text-[var(--qs-ink)] disabled:opacity-45"
            >
              {generatingCode ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <RefreshCw className="h-[18px] w-[18px]" />
              )}
              {state.info.code ? "Generate new code" : "Generate code"}
            </button>
          </section>

          <section className="mt-4 rounded-[20px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-[18px]">
            <TimingSection variant="availability" allowInlineStart={false} flat />
          </section>

          <section className="mt-4 rounded-[20px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-[18px]">
            <h2 className="text-[17px] font-extrabold leading-[1.3] text-[var(--qs-ink)]">
              Preview as a student
            </h2>
            <p className="mt-1 text-[14px] font-medium leading-[1.5] text-[var(--qs-muted)]">
              See the exact student quiz design and flow. No exam mode, timer or monitoring.
            </p>
            <button
              type="button"
              onClick={handlePreview}
              className="mt-3.5 flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[var(--qs-ink)] text-[16px] font-extrabold text-[var(--qs-ink)]"
            >
              <Eye className="h-[18px] w-[18px]" /> Preview quiz
            </button>
          </section>

          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_20px_rgba(27,24,64,0.10)]">
            <div className="grid grid-cols-[1fr_1.5fr] gap-2.5">
              <button
                type="button"
                onClick={() => void saveMobile("draft")}
                disabled={!dirty || mobileSaving}
                className="flex h-[54px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[var(--qs-line)] text-[16px] font-extrabold text-[var(--qs-ink)] disabled:opacity-50"
              >
                {savingAction === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingAction === "draft" ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={() => void saveMobile("exit")}
                disabled={mobileSaving}
                className="flex h-[54px] items-center justify-center gap-2 rounded-[16px] bg-[var(--qs-brand)] text-[16px] font-extrabold text-white shadow-[0_4px_0_#4a22b8] transition active:translate-y-[3px] active:shadow-[0_1px_0_#4a22b8] disabled:opacity-60"
              >
                {savingAction === "exit" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Save &amp; exit <ArrowRight className="h-5 w-5" />
                  </>
                )}
                {savingAction === "exit" ? "Saving…" : null}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn("space-y-4", editMode && "hidden lg:block")}>
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
