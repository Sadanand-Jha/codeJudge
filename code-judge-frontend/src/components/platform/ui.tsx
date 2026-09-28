"use client";

import React from "react";

/* Shared primitives for the private /platform control center.
   Dense, dark-first, developer aesthetic: subtle borders, compact type,
   color reserved for status. All colors come from the app design tokens so
   both dark and light themes work. */

export function SectionCard({ id, title, subtitle, right, children }: {
  id?: string; title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} className="pf-card scroll-mt-24 overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)]">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, sub, delta }: {
  label: string; value: string; sub?: string; delta?: number | null;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      <div className="mt-0.5 truncate text-[20px] font-semibold leading-tight text-[var(--text-primary)]">{value}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
        {delta !== undefined && delta !== null && (
          <span className={delta >= 0 ? "font-medium text-[var(--success)]" : "font-medium text-[var(--danger)]"}>
            {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--platform-skeleton)] ${className}`} aria-hidden="true" />;
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="mx-auto mb-3 flex h-8 w-12 items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--platform-soft)]" aria-hidden="true">
        {[4, 9, 6, 12].map((h, i) => <span key={i} className="w-1 rounded-full bg-[var(--text-muted)] opacity-50" style={{ height: h }} />)}
      </div>
      <p className="text-[13px] font-medium text-[var(--text-primary)]">{message}</p>
      {detail && <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-[var(--text-muted)]">{detail}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-[12px]">
      <span className="text-[var(--danger)]">{message}</span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
      >
        Retry
      </button>
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const color =
    status === "operational" ? "bg-[var(--success)]"
    : status === "degraded" ? "bg-[var(--warning)]"
    : status === "down" ? "bg-[var(--danger)]"
    : "bg-[var(--text-muted)]";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} aria-hidden="true" />;
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n}%`;
}

export function fmtDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
