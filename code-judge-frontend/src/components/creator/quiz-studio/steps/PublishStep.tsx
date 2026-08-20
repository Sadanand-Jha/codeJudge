"use client";

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
} from "lucide-react";
import { useStudio } from "../StudioProvider";
import { toast } from "@/lib/toast";

export function PublishStep({
  onPublish,
}: {
  onPublish: () => void;
}) {
  const { state, summary } = useStudio();

  const handlePublish = () => {
    const link = `${window.location.origin}/quiz/${state.info.code}/live`;
    navigator.clipboard.writeText(link);
    toast.success({
      title: state.info.title || "Quiz published",
      description: "Quiz link copied to clipboard.",
    });
    onPublish();
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
    { label: "End", value: state.info.endDate || "No end date" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
            <Send className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-extrabold text-text-primary">
            Ready to publish?
          </h2>
        </div>

        <p className="text-xs text-text-secondary">
          Review the details below. After publishing, some settings may become
          locked once students begin attempting the quiz.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-white/[0.02] p-4 sm:p-6">
          <div className="flex items-center gap-4">
            {state.branding.logoUrl ? (
              <img src={state.branding.logoUrl} alt="thumb" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-bold text-white">
                Quiz cover
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-text-primary">{state.info.title || "Untitled Quiz"}</p>
              <p className="text-xs text-text-secondary line-clamp-2">
                {state.info.shortDescription || "No description."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-xs">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between rounded-lg border-b border-border py-1.5"
            >
              <span className="text-text-secondary">{r.label}</span>
              <span className="font-medium text-text-primary">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.info.code);
              toast.success({ title: "Code copied", description: state.info.code });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            <Copy className="h-3.5 w-3.5" /> {state.info.code}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-105 hover:shadow-[0_8px_24px_rgba(236,72,153,0.45)]"
          >
            <Send className="h-4 w-4" /> Publish Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

export function SuccessStep({ onDashboard }: { onDashboard: () => void }) {
  const { state, summary } = useStudio();
  const link = `${window.location.origin}/quiz/${state.info.code}/live`;
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10 text-center">
      <div>
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_12px_36px_rgba(236,72,153,0.4)]">
          <Check className="h-9 w-9" />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold text-text-primary">
          Your quiz is live.
        </h2>
        <p className="mt-3 text-xs text-text-secondary">
          Share this link with participants:
        </p>
        <div className="my-3 flex items-center justify-center gap-2">
          <code className="break-all text-xs text-text-primary">{link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success({ title: "Link copied" });
            }}
            className="rounded-lg border border-border p-1 text-xs text-text-secondary hover:text-text-primary"
            title="Copy link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px] text-text-secondary">
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
            className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Open Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success({ title: "Link copied" });
            }}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary"
          >
            Copy Link
          </button>
          <button
            type="button"
            onClick={onDashboard}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary"
          >
            Go to Dashboard
          </button>
        </div>
        <p className="mt-6 text-[10px] text-text-muted">
          0 attempts · 0 participants · ₹0 revenue
        </p>
      </div>
    </div>
  );
}
