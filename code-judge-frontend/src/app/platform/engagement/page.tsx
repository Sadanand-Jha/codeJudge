"use client";

import { useState } from "react";
import { platformApi } from "@/services/platform";
import type { PlatformRange } from "@/services/platform";
import { SectionCard, HeatmapSkeleton, EmptyState } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/engagement — calls /series only. */
export default function EngagementPage() {
  const [range, setRange] = useState<PlatformRange>("30d");
  const series = useAsync(() => platformApi.series(range), `series:${range}`);
  return (
    <div className="space-y-4">
      <PageHeader title="Engagement" detail="Daily learning signals across the selected range." />
      <div className="flex gap-1" role="tablist" aria-label="Range">
        {(["today", "7d", "30d", "90d"] as PlatformRange[]).map((r) => (
          <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)}
            className={`rounded-[6px] border border-[var(--border)] px-2.5 py-1.5 text-[12px] ${range === r ? "bg-[var(--card-hover)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{r}</button>
        ))}
      </div>
      <SectionCard title="Engagement rhythm" subtitle={`Daily signals · ${range}`}>
        <EngagementHeatmap points={series.data?.points ?? []} loading={series.loading} />
      </SectionCard>
    </div>
  );
}

function EngagementHeatmap({ points, loading }: { points: Array<{ label: string; dau: number; attempts: number; new_users: number; completed: number }>; loading: boolean }) {
  if (loading) return <HeatmapSkeleton />;
  if (!points.length) return <EmptyState message="Student activity will appear here" />;
  const visible = points.slice(-28);
  const rows = [
    { label: "Students", key: "dau" as const },
    { label: "Attempts", key: "attempts" as const },
    { label: "Completed", key: "completed" as const },
    { label: "New accounts", key: "new_users" as const },
  ];
  return (
    <div>
      <div className="space-y-2.5">
        {rows.map((row) => {
          const max = Math.max(1, ...visible.map((p) => Number(p[row.key]) || 0));
          return (
            <div key={row.key} className="grid grid-cols-[78px_1fr] items-center gap-3">
              <span className="text-[11px] text-[var(--text-secondary)]">{row.label}</span>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(5px, 1fr))` }}>
                {visible.map((p, i) => {
                  const value = Number(p[row.key]) || 0;
                  const strength = value / max;
                  return <span key={`${row.key}-${i}`} title={`${p.label} · ${row.label}: ${value}`} className="aspect-square min-h-2 rounded-[3px] border border-[var(--border)]" style={{ background: `rgba(236,72,153,${0.07 + strength * 0.72})` }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
