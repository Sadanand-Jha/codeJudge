"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/helpers";
import { BadgeCheck, Star } from "lucide-react";

/* ============================================================
   Advertise-specific UI primitives.
   Shared primitives (PageHeader, BillButton, Panel, StatCard,
   StatusBadge, SegmentedControl, formatINR) come from billing.
   ============================================================ */

/** Tiny "Sponsored" label used across placements for transparency. */
export function SponsoredBadge({ className }: { className?: string }) {
  return (
    <span
      title="This placement is a sponsored ad position paid for by the creator."
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted",
        className
      )}
    >
      Sponsored
    </span>
  );
}

/** A rounded inline progress bar used for quality factors. */
export function StrengthBar({
  strength,
  className,
  tone,
}: {
  strength: number;
  className?: string;
  tone?: "emerald" | "violet" | "amber";
}) {
  const pct = Math.round(Math.min(1, Math.max(0, strength)) * 100);
  const barColor =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-gradient-to-r from-indigo-500 to-violet-500";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] dark:bg-white/[0.05]", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Listed factor row with label + strength bar + optional hint. */
export function FactorRow({
  label,
  strength,
  hint,
}: {
  label: string;
  strength: number;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className="text-xs font-bold text-text-primary tabular-nums">
          {Math.round(strength * 100)} / 100
        </span>
      </div>
      <StrengthBar strength={strength} />
      {hint && <p className="mt-1 text-[10px] text-text-muted">{hint}</p>}
    </div>
  );
}

/** Large promotion-quality meter: "82 / 100 — Excellent". */
export function QualityMeter({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const pct = Math.min(100, Math.max(0, score));
  const verdict = pct >= 75 ? "Excellent" : pct >= 55 ? "Good" : "Needs attention";
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-semibold text-text-secondary">{label}</p>
        <p className="text-xl font-extrabold tracking-tight text-text-primary tabular-nums">
          {pct}
          <span className="text-sm font-medium text-text-muted"> / 100</span>
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
          <BadgeCheck className="h-3 w-3" />
          {verdict}
        </span>
      </div>
    </div>
  );
}

/** One-star rating line used on product cards ("4.8 ★"). */
export function ProductRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500/90">
      <Star className="h-3 w-3 fill-current" />
      {rating.toFixed(1)}
    </span>
  );
}

/** A single metric (value + label), used in campaign cards & detail. */
export function MetricCell({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-sm font-bold text-text-primary tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

/** Badge to communicate an estimate is not a guarantee. */
export function EstimateHint() {
  return (
    <p className="mt-1 flex items-start gap-1 text-[11px] leading-relaxed text-text-muted">
      <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
      Estimates are based on recent marketplace performance for similar products and are not guarantees.
    </p>
  );
}