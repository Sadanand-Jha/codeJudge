"use client";

import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { formatDateTimeIST } from "./timing/helpers";

export function QuizSummaryCard({ className }: { className?: string }) {
  const { state, summary } = useStudio();
  const lifecycle = state.info.quizLifecycle;
  const status =
    lifecycle === "live"
      ? { label: "Live", pill: "border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] text-[var(--qs-ok)]", live: true }
      : lifecycle === "scheduled"
        ? { label: "Scheduled", pill: "border-[#a85d00]/40 bg-[#fff3d6] text-[#a85d00]", live: false }
        : lifecycle === "ended"
          ? { label: "Ended", pill: "border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] text-[var(--qs-bad)]", live: false }
          : { label: "Draft", pill: "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]", live: false };

  const isScheduled = lifecycle === "scheduled" && Boolean(state.info.startDate);
  const startLabel = isScheduled ? formatDateTimeIST(state.info.startDate) : "Manual";

  return (
    <aside className={cn("min-w-0", className)} aria-label="Quiz summary">
      <div className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1a1240]">Quiz summary</p>
          <ClipboardList className="h-4 w-4 text-[#1a1240]" />
        </div>

        <dl className="divide-y-2 divide-[var(--qs-line)] text-xs">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="font-bold text-[var(--qs-muted)]">Status</dt>
            <dd>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                  status.pill
                )}
              >
                {status.live && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />
                )}
                {status.label}
              </span>
            </dd>
          </div>
          <SummaryRow label="Starts" value={startLabel} />
          <SummaryRow label="Questions" value={String(summary.questionCount)} />
          <SummaryRow label="Negative marking" value={state.settings.negativeMarking ? "On" : "Off"} />
        </dl>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 font-bold text-[var(--qs-muted)]">{label}</dt>
      <dd className={cn("min-w-0 break-words text-right font-extrabold tabular-nums text-[var(--qs-ink)]", valueClassName)}>{value}</dd>
    </div>
  );
}
