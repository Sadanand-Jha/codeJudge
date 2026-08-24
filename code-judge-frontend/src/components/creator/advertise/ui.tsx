"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/helpers";
import { BadgeCheck, Star } from "lucide-react";

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

/** Large promotion-quality meter: "88 / 100 — Excellent". */
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
    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-text-muted">
      <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
      <span>Estimated relevant student reach — not a guarantee of purchases or enrollments.</span>
    </p>
  );
}

/** Budget → Reach hero slider. */
export function BudgetReachSlider({
  value,
  onChange,
  reach,
}: {
  value: number;
  onChange: (v: number) => void;
  reach: number;
}) {
  const pct = ((value - 500) / (10000 - 500)) * 100;
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-6">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">Campaign Budget</p>

      {/* Slider track */}
      <div className="relative mt-5 px-1">
        <div className="relative h-2 rounded-full bg-white/[0.06]">
          <div
            className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range"
            min={500}
            max={10000}
            step={100}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-pink-500"
            aria-label="Campaign budget"
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-semibold tabular-nums text-text-muted">
          <span>₹500</span>
          <span>₹10,000</span>
        </div>
      </div>

      {/* Reach hero */}
      <div className="mt-6 text-center">
        <p className="text-[13px] font-medium text-text-secondary">Your campaign will reach approximately</p>
        <p className="mt-2 flex items-center justify-center gap-2">
          <span className="text-4xl">👥</span>
          <span className="text-[44px] font-extrabold tracking-tight text-text-primary tabular-nums">{reach.toLocaleString("en-IN")}</span>
        </p>
        <p className="text-[13px] font-semibold text-text-secondary">relevant students</p>
        <p className="mt-2 text-xs font-bold tabular-nums text-pink-600 dark:text-pink-400">
          ₹{value.toLocaleString("en-IN")} → {reach.toLocaleString("en-IN")} relevant students
        </p>
      </div>

      {/* Quick presets row */}
      <div className="mt-6 grid grid-cols-5 gap-1.5">
        {[500, 1000, 2500, 5000, 10000].map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            className={cn(
              "rounded-lg border px-1 py-2 text-[11px] font-bold tabular-nums transition-colors",
              value === b
                ? "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-300"
                : "border-border bg-card text-text-muted hover:text-text-primary hover:border-border-hover"
            )}
          >
            ₹{b >= 1000 ? `${b / 1000}k` : b}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Marketplace preview card — how promoted series appears to students. */
export function CampaignPreviewCard({
  product,
}: {
  product: { name: string; rating: number; testCount: number; attempts: number; price: number; description?: string } | null;
}) {
  if (!product) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-text-muted">Select a test series to see preview</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border/60 bg-white/[0.02] px-4 py-2">
        <SponsoredBadge />
      </div>
      <div className="p-5">
        <h3 className="text-[15px] font-bold text-text-primary">{product.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
            <Star className="h-3 w-3 fill-current" /> {product.rating.toFixed(1)}
          </span>
          <span className="text-text-muted">·</span>
          <span>{product.testCount} Tests · {product.attempts.toLocaleString("en-IN")} attempts</span>
        </p>
        {product.description && <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{product.description}</p>}
        <p className="mt-3 text-[18px] font-extrabold text-text-primary tabular-nums">₹{product.price.toLocaleString("en-IN")}</p>
        <div className="mt-4">
          <span className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.25)]">
            Try Test Series
          </span>
        </div>
        <p className="mt-2 text-center text-[10px] text-text-muted">Sponsored · Shown to relevant students based on preparation activity</p>
      </div>
    </div>
  );
}

/** Side-by-side budget recommendation cards. */
export function BudgetRecommendation({
  onSelect,
  selected,
}: {
  onSelect: (b: number) => void;
  selected: number;
}) {
  const opts = [
    { budget: 500, reach: 125, label: "Test the waters", sub: "~125 students" },
    { budget: 2500, reach: 800, label: "Recommended", sub: "~800 students", recommended: true },
    { budget: 10000, reach: 3250, label: "Maximum reach", sub: "~3,250 students" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {opts.map((o) => (
        <button
          key={o.budget}
          type="button"
          onClick={() => onSelect(o.budget)}
          className={cn(
            "relative rounded-2xl border p-4 text-left transition-all",
            o.recommended
              ? "border-pink-500/30 bg-pink-500/[0.06] ring-1 ring-pink-500/20"
              : "border-border bg-white/[0.02] hover:border-border-hover",
            selected === o.budget && "ring-2 ring-pink-500/30 border-pink-500/50"
          )}
        >
          {o.recommended && (
            <span className="absolute -top-2 left-4 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
              Recommended
            </span>
          )}
          <p className="text-sm font-extrabold text-text-primary tabular-nums">₹{o.budget.toLocaleString("en-IN")}</p>
          <p className="mt-0.5 text-xs font-semibold text-text-secondary">{o.label}</p>
          <p className="text-xs text-text-muted">{o.sub}</p>
          {o.recommended && <p className="mt-2 text-[11px] leading-relaxed text-text-muted">Good starting budget for your test series.</p>}
        </button>
      ))}
    </div>
  );
}
