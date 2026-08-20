"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";
import { useState, useRef, useEffect, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, Loader2, Lock, RotateCcw, Inbox, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/helpers";

/* ============================================================
   Currency & number formatting (Indian numbering system)
   ============================================================ */
export function formatINR(value: number): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatINRCompact(value: number): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs}`;
}

export function Money({
  value,
  className,
  compact,
}: {
  value: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("font-semibold tabular-nums text-text-primary", className)}>
      {compact ? formatINRCompact(value) : formatINR(value)}
    </span>
  );
}

/* ============================================================
   Buttons — meaningful loading states everywhere
   ============================================================ */
type ButtonVariant = "primary" | "ghost" | "outline" | "danger" | "subtle";

interface BillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  href?: string;
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold shadow-[0_4px_16px_rgba(236,72,153,0.28)] hover:shadow-[0_8px_24px_rgba(236,72,153,0.38)] hover:brightness-105",
  ghost:
    "border border-border bg-card text-text-primary font-semibold hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent",
  outline:
    "border border-pink-500/40 bg-pink-500/5 text-pink-600 dark:text-ai-accent font-semibold hover:bg-pink-500/10 dark:hover:bg-ai-accent/10",
  danger:
    "border border-danger/30 bg-danger/10 text-danger font-bold hover:bg-danger/20 hover:shadow-[0_0_16px_rgba(239,68,68,0.25)]",
  subtle:
    "bg-transparent text-text-secondary font-medium hover:bg-white/[0.04] hover:text-text-primary",
};

export function BillButton({
  variant = "primary",
  loading,
  icon,
  href,
  className,
  children,
  disabled,
  ...rest
}: BillButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
    buttonStyles[variant],
    className
  );
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={disabled}>
        {content}
      </Link>
    );
  }
  return (
    <button disabled={disabled || loading} className={cls} {...rest}>
      {content}
    </button>
  );
}

/* ============================================================
   Icon button (header actions)
   ============================================================ */
export function IconButton({
  label,
  onClick,
  children,
  className,
  active,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-text-secondary transition-all duration-150",
        "hover:border-border-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent/40 outline-none",
        active && "border-pink-500/40 text-pink-500 dark:border-ai-accent/40 dark:text-ai-accent",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================
   Delta pill — subtle trend indicator
   ============================================================ */
export function DeltaPill({
  pct,
  tone = "auto",
  invert,
  className,
}: {
  pct: number;
  tone?: "auto" | "good" | "bad" | "neutral";
  invert?: boolean;
  className?: string;
}) {
  const positive = invert ? pct <= 0 : pct >= 0;
  const toneClass =
    tone === "neutral"
      ? "text-text-secondary bg-white/[0.04] border-border"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
        : tone === "bad"
          ? "text-rose-600 dark:text-rose-300 bg-rose-500/10 border-rose-500/25"
          : positive
            ? "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
            : "text-rose-600 dark:text-rose-300 bg-rose-500/10 border-rose-500/25";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums",
        toneClass,
        className
      )}
    >
      {pct >= 0 ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(pct)}%
    </span>
  );
}

/* ============================================================
   Panel — consistent card shell
   ============================================================ */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card transition-colors duration-200 hover:border-border-hover",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(noPadding ? "" : "p-5", (title || action) && "pt-0", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   StatCard — premium, subtle, no giant icons
   ============================================================ */
const ACCENT_DOT: Record<string, string> = {
  primary: "bg-violet-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  gold: "bg-amber-400",
  info: "bg-sky-500",
};

export function StatCard({
  label,
  value,
  display,
  delta,
  hint,
  accent = "primary",
  icon,
}: {
  label: string;
  value: number;
  display?: string;
  delta?: number;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "gold" | "info";
  icon?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-border-hover"
    >
      <span className={cn("absolute left-0 top-0 h-full w-[3px]", ACCENT_DOT[accent])} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</p>
        {icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">{icon}</div>}
      </div>
      <p className="mt-2.5 text-[26px] font-bold leading-none tracking-tight text-text-primary tabular-nums">
        {display ?? formatINR(value)}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {typeof delta === "number" && <DeltaPill pct={delta} />}
        {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
      </div>
    </motion.div>
  );
}

/* ============================================================
   StatusBadge — subtle colored pill
   ============================================================ */
export type StatusTone = "emerald" | "amber" | "rose" | "violet" | "sky" | "slate";

export const STATUS_TONES: Record<StatusTone, string> = {
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  violet: "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  sky: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  slate: "border-border bg-white/[0.04] text-text-secondary",
};

export function StatusBadge({ label, tone = "slate", dot, className }: { label: string; tone?: StatusTone; dot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        STATUS_TONES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {label}
    </span>
  );
}

export const PAYOUT_STATUS_TONE: Record<string, StatusTone> = {
  Completed: "emerald",
  Processing: "sky",
  Pending: "amber",
  Failed: "rose",
  Cancelled: "slate",
  Requested: "amber",
  Approved: "violet",
  Rejected: "rose",
  Refunded: "rose",
};

/* ============================================================
   Segmented control — Earnings | Sales | Refunds, date presets
   ============================================================ */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  className,
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const layoutId = useId();
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-xl border border-border bg-card-hover p-0.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "relative rounded-lg font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
            value === opt.id ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
          )}
        >
          {value === opt.id && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-border dark:bg-ai-hover dark:ring-ai-border"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   Date range picker (header)
   ============================================================ */
export interface DatePreset {
  id: string;
  label: string;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "10d", label: "Last 10 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "lastmonth", label: "Last month" },
  { id: "custom", label: "Custom range" },
];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-20");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = DATE_PRESETS.find((p) => p.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover"
      >
        <CalendarDays className="h-3.5 w-3.5 text-text-secondary" />
        {current?.label ?? "Select range"}
        <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl"
          >
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                  value === p.id
                    ? "bg-accent/15 font-semibold text-accent"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                )}
              >
                {p.label}
                {p.id === "custom" && (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-[104px] rounded-md border border-border bg-input-bg px-1.5 py-0.5 text-[11px] text-text-primary"
                    />
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-[104px] rounded-md border border-border bg-input-bg px-1.5 py-0.5 text-[11px] text-text-primary"
                    />
                  </div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   Loading skeletons
   ============================================================ */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[0.06] dark:bg-white/[0.05]", className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-4 w-28" />
    </div>
  );
}

export function PanelSkeleton({ title }: { title?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {title && <Skeleton className="h-4 w-40" />}
      <Skeleton className="mt-4 h-48 w-full" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2.5">
      <div className="hidden items-center gap-4 sm:flex">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 rounded-xl border border-border/60 p-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3.5 flex-1", c === 0 && "max-w-[40%]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Empty state
   ============================================================ */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white/[0.03] text-text-muted">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-text-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ============================================================
   Error state
   ============================================================ */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger/[0.03] px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/20 bg-danger/10 text-danger">
        <X className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-text-primary">We couldn&apos;t load your financial data.</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-text-secondary">
        {message ?? "Something went wrong on our side. Please try again in a moment."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-text-primary transition-all hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Page header (billing pages)
   ============================================================ */
export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-primary sm:text-2xl">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-[13px] text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ============================================================
   Mock-data tag — makes it unambiguous the figures are sample data
   ============================================================ */
export function MockDataTag() {
  return (
    <span
      title="These figures are sample data for UI development and will be replaced by real backend data."
      className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300"
    >
      <ShieldCheck className="h-3 w-3" />
      Sample data
    </span>
  );
}

/* ============================================================
   Secure note — "Last financial activity"
   ============================================================ */
export function SecureNote({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
      <Lock className="h-3 w-3" />
      {text}
    </div>
  );
}
