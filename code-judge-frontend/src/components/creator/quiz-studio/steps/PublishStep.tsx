"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Check, BarChart3, Copy } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { useStudio } from "../StudioProvider";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import { StudioStepLayout } from "../primitives";
import { formatDateTimeIST } from "../components/timing/helpers";

export function PublishStep({
  onPublish,
  embedded = false,
}: {
  onPublish: () => void;
  embedded?: boolean;
}) {
  const { state, summary, saveToServer } = useStudio();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handlePublish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveToServer({ publish: true });
      const link = `${window.location.origin}/quiz/${state.info.code}/live`;
      navigator.clipboard.writeText(link);
      toast.success({
        title: state.info.title || "Quiz published",
        description: "Quiz saved and link copied to clipboard.",
      });
      onPublish();
    } catch (err) {
      toast.error({
        title: "Could not start quiz",
        description: getApiErrorMessage(err, "Something went wrong. Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const isScheduled = state.info.quizLifecycle === "scheduled" && Boolean(state.info.startDate);
  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: "Title", value: state.info.title || "Untitled Quiz" },
    { label: "Questions", value: String(summary.questionCount) },
    isScheduled
      ? { label: "Attempts", value: "Open during schedule" }
      : { label: "Duration", value: state.info.duration + " min" },
    { label: "Audience", value: state.audience.mode },
    {
      label: "Price",
      value: state.pricing.mode === "paid" ? "₹" + state.pricing.price : "Free",
    },
    {
      label: "Start",
      value: state.info.startDate ? formatDateTimeIST(state.info.startDate, "Immediately") : "Immediately",
    },
    {
      label: "End",
      value: state.info.endDate ? formatDateTimeIST(state.info.endDate, "Manual") : "Manual",
    },
  ];

  return (
    <StudioStepLayout width="compact" className="sm:py-8" embedded={embedded}>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
    >
        <div className="border-b-2 border-[var(--qs-line)] px-6 py-5">
          <h2 className="text-base font-extrabold text-[var(--qs-ink)]">
            Ready to publish?
          </h2>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-4 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
            {state.branding.logoUrl ? (
              <img src={state.branding.logoUrl} alt="thumb" className="h-14 w-20 rounded-[10px] border-2 border-[var(--qs-line)] object-cover" />
            ) : (
              <div className="flex h-14 w-20 items-center justify-center rounded-[10px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                No cover
              </div>
            )}
            <div className="min-w-0">
              <p className="break-words text-sm font-extrabold text-[var(--qs-ink)]">{state.info.title || "Untitled Quiz"}</p>
              <p className="mt-0.5 break-words text-xs font-medium text-[var(--qs-muted)]">
                {state.info.shortDescription || "No description."}
              </p>
            </div>
          </div>

          <dl className="mt-5 divide-y-2 divide-[var(--qs-line)] rounded-[14px] border-2 border-[var(--qs-line)]">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                <dt className="font-bold text-[var(--qs-muted)]">{r.label}</dt>
                <dd className="max-w-[65%] break-words text-right font-bold text-[var(--qs-ink)]">{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60"
            >
              {saving ? (
                <>
                  <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" /> Starting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> {isScheduled ? "Schedule Quiz" : "Start Quiz"}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Publish confirmation */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center bg-[#1a1240]/60 p-4"
          onClick={() => !saving && setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[8px_8px_0_var(--qs-sun)]"
          >
            {/* Header */}
            <div className="border-b-2 border-[var(--qs-line)] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
                  <Send className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--qs-ink)]">
                    {isScheduled ? "Schedule this quiz?" : "Start this quiz?"}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                    {isScheduled
                      ? "Participants can join and attempt throughout the scheduled window. Responses stop automatically at the end time."
                      : "This will make the quiz live immediately. Participants can start attempting it as soon as you confirm."}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-6 py-5">
              <dl className="divide-y-2 divide-[var(--qs-line)] rounded-[14px] border-2 border-[var(--qs-line)]">
                {[
                  { label: "Quiz", value: state.info.title || "Untitled Quiz" },
                  { label: "Questions", value: String(summary.questionCount) },
                  isScheduled
                    ? { label: "Attempts", value: "Open during schedule" }
                    : { label: "Duration", value: `${state.info.duration} min` },
                  {
                    label: "Audience",
                    value:
                      state.audience.mode === "classroom"
                        ? `Rooms (${(state.audience.roomIds ?? []).length})`
                        : state.audience.mode,
                  },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <dt className="font-bold text-[var(--qs-muted)]">{r.label}</dt>
                    <dd className="max-w-[65%] break-words text-right font-bold text-[var(--qs-ink)]">{r.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 rounded-[12px] border-2 border-[#a85d00]/40 bg-[#fff3d6] px-3.5 py-2.5 text-xs font-medium leading-relaxed text-[#a85d00]">
                Once students start attempting, questions and key settings become
                locked. You can unpublish later if needed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-4 py-2 text-sm font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" /> Publishing…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> {isScheduled ? "Yes, Schedule" : "Yes, Publish"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudioStepLayout>
  );
}

export function SuccessStep({ onDashboard }: { onDashboard: () => void }) {
  const { state, summary, setState } = useStudio();
  const link = `${window.location.origin}/quiz/${state.info.code}/live`;
  const isScheduled = state.info.quizLifecycle === "scheduled" && Boolean(state.info.startDate);

  const editQuiz = () => {
    setState((s) => ({ ...s, published: false, step: "details" }));
  };

  return (
    <div className="flex flex-col">
    <div className="">
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10 text-center">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold text-[var(--qs-ink)]">
          {isScheduled ? "Your quiz is scheduled." : "Your quiz is live."}
        </h2>
        <p className="mt-2 text-sm font-medium text-[var(--qs-muted)]">
          {isScheduled ? "Participants can join during the scheduled window. Share this link:" : "Share this link with participants:"}
        </p>
        <div className="mx-auto my-4 flex max-w-md items-center justify-between gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2">
          <code className="truncate text-xs font-medium text-[var(--qs-ink)]">{link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success({ title: "Link copied" });
            }}
            className="shrink-0 rounded-[8px] p-1.5 text-[var(--qs-muted)] transition-colors duration-150 hover:bg-[var(--qs-poly-2)] hover:text-[var(--qs-ink)]"
            title="Copy link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-medium text-[var(--qs-muted)]">
          <span>{summary.questionCount} questions</span>
          <span>·</span>
          <span>{isScheduled ? "Open during schedule" : `${state.info.duration} min`}</span>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center sm:flex-wrap">
          <button
            type="button"
            onClick={() => window.open(link, "_blank")}
            className="rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            Open Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success({ title: "Link copied" });
            }}
            className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)]"
          >
            Copy Link
          </button>
          <button
            type="button"
            onClick={editQuiz}
            className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)]"
          >
            Edit Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem("studio_quiz_draft");
              } catch {}
              window.location.assign("/creator/quizzes/create");
            }}
            className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)]"
          >
            Create New Quiz
          </button>
          <button
            type="button"
            onClick={onDashboard}
            className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)]"
          >
            Go to Dashboard
          </button>
          {state.serverQuizId && (
            <a
              href={`/creator/quizzes/${state.info.code}/responses`}
              className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-2 text-sm font-extrabold text-[#1a1240] transition-transform duration-150 hover:-translate-y-px active:translate-y-0"
            >
              <BarChart3 className="h-4 w-4" /> View Responses
            </a>
          )}
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
