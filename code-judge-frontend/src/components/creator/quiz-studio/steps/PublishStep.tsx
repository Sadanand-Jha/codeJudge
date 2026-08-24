"use client";

import { useState } from "react";
import {
  Send,
  ListChecks,
  Award,
  Clock,
  Users,
  IndianRupee,
  Calendar,
  Check,
  Copy,
  Loader2,
} from "lucide-react";
import { useStudio } from "../StudioProvider";
import { toast } from "@/lib/toast";

export function PublishStep({
  onPublish,
}: {
  onPublish: () => void;
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
        title: "Could not publish quiz",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { label: "Title", value: state.info.title || "Untitled Quiz" },
    { label: "Questions", value: summary.questionCount + " · " + summary.totalMarks + " marks" },
    { label: "Duration", value: state.info.duration + " min" },
    { label: "Audience", value: state.audience.mode },
    {
      label: "Price",
      value: state.pricing.mode === "paid" ? "₹" + state.pricing.price : "Free",
    },
    { label: "Start", value: state.info.startDate || "Immediately" },
    { label: "End", value: state.info.endDate || "Manual" },
  ];

  return (
    <div className="flex flex-col bg-[#F8FAFC]">
    <div className="">
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold text-text-primary">
            Ready to publish?
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Publishing will immediately make this quiz live. Participants will be
            able to start attempting it right away.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-4 rounded-lg border border-border bg-background p-4">
            {state.branding.logoUrl ? (
              <img src={state.branding.logoUrl} alt="thumb" className="h-14 w-20 rounded-md border border-border object-cover" />
            ) : (
              <div className="flex h-14 w-20 items-center justify-center rounded-md bg-card-hover text-[10px] font-medium uppercase tracking-wide text-text-muted">
                No cover
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{state.info.title || "Untitled Quiz"}</p>
              <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
                {state.info.shortDescription || "No description."}
              </p>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                <dt className="text-text-secondary">{r.label}</dt>
                <dd className="font-medium text-text-primary">{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.info.code);
                toast.success({ title: "Code copied", description: state.info.code });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
            >
              <Copy className="h-3.5 w-3.5" /> {state.info.code}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 px-4 py-2 text-sm font-semibold transition-colors duration-150 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Publish Quiz
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Publish confirmation */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !saving && setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            {/* Header */}
            <div className="border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Send className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Publish this quiz?</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    This will make the quiz live immediately. Participants can start
                    attempting it as soon as you confirm.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-6 py-5">
              <dl className="divide-y divide-border rounded-lg border border-border">
                {[
                  { label: "Quiz", value: state.info.title || "Untitled Quiz" },
                  { label: "Code", value: state.info.code },
                  { label: "Questions", value: `${summary.questionCount} · ${summary.totalMarks} marks` },
                  { label: "Duration", value: `${state.info.duration} min` },
                  {
                    label: "Audience",
                    value:
                      state.audience.mode === "classroom"
                        ? `Rooms (${(state.audience.roomIds ?? []).length})`
                        : state.audience.mode,
                  },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <dt className="text-text-secondary">{r.label}</dt>
                    <dd className="max-w-[60%] truncate font-medium text-text-primary">{r.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                Once students start attempting, questions and key settings become
                locked. You can unpublish later if needed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 transition-colors duration-150 hover:bg-indigo-100 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Yes, Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
    </div>
  );
}

export function SuccessStep({ onDashboard }: { onDashboard: () => void }) {
  const { state, summary, setState } = useStudio();
  const link = `${window.location.origin}/quiz/${state.info.code}/live`;

  const editQuiz = () => {
    setState((s) => ({ ...s, published: false, step: "setup" }));
  };

  return (
    <div className="flex flex-col bg-[#F8FAFC]">
    <div className="">
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-text-primary">
          Your quiz is live.
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Share this link with participants:
        </p>
        <div className="mx-auto my-4 flex max-w-md items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <code className="truncate text-xs text-text-primary">{link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success({ title: "Link copied" });
            }}
            className="shrink-0 rounded-md p-1.5 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
            title="Copy link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-text-secondary">
          <span>{summary.questionCount} questions</span>
          <span>·</span>
          <span>{summary.totalMarks} marks</span>
          <span>·</span>
          <span>{state.info.duration} min</span>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.open(link, "_blank")}
            className="rounded-lg border border-indigo-500/40 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 px-4 py-2 text-sm font-semibold transition-colors duration-150 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25"
          >
            Open Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success({ title: "Link copied" });
            }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover"
          >
            Copy Link
          </button>
          <button
            type="button"
            onClick={editQuiz}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover"
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
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover"
          >
            Create New Quiz
          </button>
          <button
            type="button"
            onClick={onDashboard}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
