"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, Lock, RotateCcw, Inbox, X } from "lucide-react";
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
    <span className={cn("font-semibold tabular-nums text-[var(--qs-ink)]", className)}>
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
  primary: "b-pri",
  ghost: "",
  outline: "border-[var(--qs-brand)]/40 text-[var(--qs-brand)]",
  danger: "b-danger",
  subtle: "b-ghost",
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
  const cls = cn("b", buttonStyles[variant], loading && "loading", className);
  const content = (
    <>
      {!loading && icon}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={disabled} aria-busy={loading || undefined}>
        {content}
      </Link>
    );
  }
  return (
    <button disabled={disabled || loading} aria-busy={loading || undefined} className={cls} {...rest}>
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
        "b b-icon sm",
        active && "border-[var(--qs-brand)] text-[var(--qs-brand)]",
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
      ? "text-[var(--qs-muted)] bg-[var(--qs-line)]/30 border-[var(--qs-line)]"
      : tone === "good"
        ? "text-[var(--qs-ok)] bg-[var(--qs-okbg)] border-[var(--qs-ok)]/30"
        : tone === "bad"
          ? "text-[var(--qs-bad)] bg-[var(--qs-badbg)] border-[var(--qs-bad)]/30"
          : positive
            ? "text-[var(--qs-ok)] bg-[var(--qs-okbg)] border-[var(--qs-ok)]/30"
            : "text-[var(--qs-bad)] bg-[var(--qs-badbg)] border-[var(--qs-bad)]/30";

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
        "rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {title && <h3 className="qs-display text-[21px] font-extrabold text-[var(--qs-ink)]">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">{subtitle}</p>}
          </div>
          {action && <div className="w-full min-w-0 sm:w-auto">{action}</div>}
        </div>
      )}
      <div className={cn(noPadding ? "" : "p-5 sm:p-6", (title || action) && "pt-0", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/* ============================================================
    StatCard — premium white+pink, subtle accents
    ============================================================ */
const ACCENT_DOT: Record<string, string> = {
  primary: "bg-[var(--qs-brand)]",
  success: "bg-[var(--qs-ok)]",
  warning: "bg-[var(--qs-sun)]",
  gold: "bg-[var(--qs-sun)]",
  info: "bg-[var(--qs-brand)]",
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
      className="group relative min-w-0 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5 transition-all duration-200 hover:border-[var(--qs-brand)]/40"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ACCENT_DOT[accent])} />
          <span className="truncate">{label}</span>
        </p>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors group-hover:border-[var(--qs-brand)]/30 group-hover:text-[var(--qs-brand)]">
            {icon}
          </div>
        )}
      </div>
      <p className="qs-display mt-2 text-[30px] font-extrabold leading-none tracking-tight text-[var(--qs-ink)] tabular-nums">
        {display ?? formatINR(value)}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {typeof delta === "number" && <DeltaPill pct={delta} />}
        {hint && <span className="truncate text-[12px] text-[var(--qs-muted)]" title={hint}>{hint}</span>}
      </div>
    </motion.div>
  );
}

/* ============================================================
   StatusBadge — subtle colored pill
   ============================================================ */
export type StatusTone = "emerald" | "amber" | "rose" | "violet" | "sky" | "slate" | "pink";

export const STATUS_TONES: Record<StatusTone, string> = {
  emerald: "border-[var(--qs-ok)]/25 bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  amber: "border-[var(--qs-sun)]/60 bg-[var(--qs-sun)]/25 text-[var(--qs-ink)]",
  rose: "border-[var(--qs-brand)]/25 bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]",
  violet: "border-[var(--qs-brand)]/25 bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]",
  sky: "border-[var(--qs-brand)]/25 bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]",
  slate: "border-[var(--qs-line)] bg-[var(--qs-line)]/30 text-[var(--qs-muted)]",
  pink: "border-[var(--qs-brand)]/25 bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]",
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
  return (
    <div
      role="radiogroup"
      className={cn("b-seg hide-scrollbar max-w-full overflow-x-auto", className)}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "b",
            size === "sm" ? "sm" : "",
            value === opt.id ? "text-[var(--qs-bg)]" : "text-[var(--qs-muted)]"
          )}
        >
          {opt.label}
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
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-semibold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]/40"
      >
        <CalendarDays className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
        {current?.label ?? "Select range"}
        <ChevronDown className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2 shadow-[0_16px_40px_rgba(26,18,64,0.16)]"
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
                    ? "bg-[var(--qs-brand)]/10 font-semibold text-[var(--qs-brand)]"
                    : "text-[var(--qs-muted)] hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)]"
                )}
              >
                {p.label}
                {p.id === "custom" && (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-[104px] rounded-md border border-[var(--qs-line)] bg-[var(--qs-surface)] px-1.5 py-0.5 text-[11px] text-[var(--qs-ink)]"
                    />
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-[104px] rounded-md border border-[var(--qs-line)] bg-[var(--qs-surface)] px-1.5 py-0.5 text-[11px] text-[var(--qs-ink)]"
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
  return <div className={cn("app-skeleton rounded-lg", className)} aria-hidden="true" />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 sm:p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-4 w-28" />
    </div>
  );
}

export function PanelSkeleton({ title }: { title?: string }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
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
        <div key={r} className="flex items-center gap-4 rounded-xl border border-[var(--qs-line)]/60 p-3">
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
    <div className="flex flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="qs-display mt-4 text-[20px] font-extrabold text-[var(--qs-ink)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-[var(--qs-muted)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ============================================================
   Error state
   ============================================================ */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[26px] border-2 border-[var(--qs-bad)]/25 bg-[var(--qs-bad)]/[0.04] px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--qs-bad)]/25 bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]">
        <X className="h-6 w-6" />
      </div>
      <h3 className="qs-display mt-4 text-[20px] font-extrabold text-[var(--qs-ink)]">We couldn&apos;t load your financial data.</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-[var(--qs-muted)]">
        {message ?? "Something went wrong on our side. Please try again in a moment."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="b sm mt-6"
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
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="qs-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.025em] text-[var(--qs-ink)] sm:text-[34px] lg:text-[38px]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1.5 text-[14px] text-[var(--qs-muted)] sm:text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto">{actions}</div>}
    </div>
  );
}

/* ============================================================
   Secure note — "Last financial activity"
   ============================================================ */
export function SecureNote({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--qs-muted)]">
      <Lock className="h-3 w-3" />
      {text}
    </div>
  );
}
