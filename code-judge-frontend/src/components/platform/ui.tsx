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
  return <div className={`pf-skeleton rounded ${className}`} aria-hidden="true" />;
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-8 ${i === rows - 1 ? "w-4/5" : "w-full"}`} />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function HeartbeatSkeleton() {
  return (
    <div className="pf-card pf-grid grid min-h-[194px] gap-6 rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 lg:grid-cols-[1fr_320px]" role="status" aria-label="Loading platform heartbeat">
      <div className="flex flex-col justify-center">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-7 w-72 max-w-[85%] rounded-lg" />
        <Skeleton className="mt-2 h-3 w-64 max-w-[70%]" />
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i}><Skeleton className="h-5 w-12" /><Skeleton className="mt-2 h-2.5 w-16" /></div>)}
        </div>
      </div>
      <ChartSkeleton heightClass="h-[142px]" compact />
      <span className="sr-only">Loading platform heartbeat</span>
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="Loading platform metrics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pf-card flex min-h-[132px] flex-col justify-between rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-4 rounded-full" /></div>
          <div className="flex items-end justify-between gap-3">
            <div><Skeleton className="h-8 w-20 rounded-lg" /><Skeleton className="mt-2 h-2.5 w-16" /></div>
            <Skeleton className={i % 2 ? "h-11 w-11 rounded-full" : "h-8 w-16 rounded-lg"} />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading platform metrics</span>
    </div>
  );
}

export function ChartSkeleton({ heightClass = "h-[240px]", compact = false }: { heightClass?: string; compact?: boolean }) {
  return (
    <div className={`pf-skeleton-chart relative overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] ${heightClass}`} role="status" aria-label="Loading chart">
      {!compact && <div className="absolute left-3 top-3 flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-20" /></div>}
      <div className={`${compact ? "inset-x-3 bottom-3 top-8" : "inset-x-3 bottom-6 top-12"} absolute`}>
        {[0, 1, 2].map((i) => <div key={i} className="absolute inset-x-0 border-t border-[var(--border)]" style={{ top: `${i * 50}%` }} />)}
        <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M0 104 L72 89 L145 96 L218 60 L291 73 L364 43 L437 61 L510 20 L600 46 L600 120 L0 120 Z" fill="var(--platform-skeleton)" opacity=".75" />
          <path d="M0 104 L72 89 L145 96 L218 60 L291 73 L364 43 L437 61 L510 20 L600 46" fill="none" stroke="var(--platform-skeleton-strong)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="sr-only">Loading chart</span>
    </div>
  );
}

export function FeedSkeleton({ rows = 5, stats = false }: { rows?: number; stats?: boolean }) {
  return (
    <div role="status" aria-label="Loading recent activity">
      {stats && <div className="mb-4 grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-[10px] border border-[var(--border)] p-3"><Skeleton className="h-6 w-12" /><Skeleton className="mt-2 h-2.5 w-20" /></div>)}</div>}
      <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex h-[52px] items-center gap-3 py-2.5">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1"><Skeleton className={`h-3 ${i % 3 === 0 ? "w-3/5" : i % 3 === 1 ? "w-4/5" : "w-2/3"}`} /><Skeleton className="mt-2 h-2 w-2/5" /></div>
            <Skeleton className="h-2.5 w-12 shrink-0" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading recent activity</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--border)]" role="status" aria-label="Loading table">
      <div className="grid h-9 items-center gap-4 border-b border-[var(--border)] px-3" style={{ gridTemplateColumns: `1.5fr repeat(${Math.max(1, columns - 1)}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => <Skeleton key={i} className={`h-2.5 ${i === 0 ? "w-20" : "w-12"}`} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid h-[52px] items-center gap-4 border-b border-[var(--border)] px-3 last:border-0" style={{ gridTemplateColumns: `1.5fr repeat(${Math.max(1, columns - 1)}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, c) => <Skeleton key={c} className={`h-3 ${c === 0 ? (r % 2 ? "w-28" : "w-36") : (r + c) % 2 ? "w-12" : "w-16"}`} />)}
        </div>
      ))}
      <span className="sr-only">Loading table</span>
    </div>
  );
}

export function MiniStatsSkeleton({ count = 6 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="status" aria-label="Loading assessment metrics">{Array.from({ length: count }).map((_, i) => <div key={i} className="min-h-[72px] rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-3"><Skeleton className="h-2.5 w-20" /><Skeleton className="mt-3 h-6 w-14 rounded-md" /></div>)}<span className="sr-only">Loading assessment metrics</span></div>;
}

export function HeatmapSkeleton() {
  return <div className="space-y-3" role="status" aria-label="Loading engagement heatmap">{Array.from({ length: 4 }).map((_, r) => <div key={r} className="grid grid-cols-[76px_repeat(8,minmax(0,1fr))] gap-1"><Skeleton className="h-3 w-14 self-center" />{Array.from({ length: 8 }).map((_, c) => <Skeleton key={c} className="aspect-square min-h-5 rounded-[3px]" />)}</div>)}<div className="flex justify-end gap-1"><Skeleton className="h-2.5 w-8" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-2.5 w-2.5 rounded-[2px]" />)}<Skeleton className="h-2.5 w-8" /></div><span className="sr-only">Loading engagement heatmap</span></div>;
}

export function ProgressSkeleton() {
  return <div className="grid gap-3 sm:grid-cols-3" role="status" aria-label="Loading student progress">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="min-h-[128px] rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4"><Skeleton className="h-1.5 w-6 rounded-full" /><Skeleton className="mt-4 h-2.5 w-28" /><Skeleton className="mt-2 h-7 w-16 rounded-md" /><Skeleton className="mt-2 h-2.5 w-4/5" /></div>)}<span className="sr-only">Loading student progress</span></div>;
}

export function HealthSkeleton() {
  return <div className="grid grid-cols-2 gap-2" role="status" aria-label="Loading platform health">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="min-h-[64px] rounded-[9px] border border-[var(--border)] p-3"><div className="flex items-center justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-2 w-2 rounded-full" /></div><Skeleton className="mt-3 h-2.5 w-14" /></div>)}<span className="sr-only">Loading platform health</span></div>;
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
