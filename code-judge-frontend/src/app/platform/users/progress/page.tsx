"use client";

import { platformApi } from "@/services/platform";
import { SectionCard, ProgressSkeleton, ErrorState, fmtInt, fmtPct } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/users/progress — calls /overview + /users only. */
export default function ProgressPage() {
  const overview = useAsync(() => platformApi.overview("30d"), "overview:30d");
  const usersQ = useAsync(() => platformApi.users(), "users");
  const loading = usersQ.loading || overview.loading;
  const users = usersQ.data?.topUsers ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Student progress" detail="Descriptive learning signals from completed assessments." />
      <SectionCard title="Student Progress" subtitle="Completion momentum, consistency, and review signals">
        {usersQ.error ? <ErrorState message={usersQ.error.message} onRetry={usersQ.retry} /> :
          overview.error ? <ErrorState message={overview.error.message} onRetry={overview.retry} /> :
          loading ? <ProgressSkeleton /> : (
          <div className="grid gap-3 sm:grid-cols-3">
            <ProgressSignal tone="success" title="Completion momentum" value={fmtPct(overview.data?.engagement?.completionRate)} detail="Platform-wide completed attempt rate" />
            <ProgressSignal tone="info" title="Consistent participation" value={fmtInt(consistent(users))} detail="Active students with 3+ attempts and 70%+ completion" />
            <ProgressSignal tone="warning" title="Worth reviewing" value={fmtInt(needsReview(users))} detail="Active students with multiple attempts and below 50% completion" />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function consistent(users: { attempts: number; completed: number }[]) {
  return users.filter((u) => u.attempts > 0).filter((u) => u.attempts >= 3 && u.completed / u.attempts >= .7).length;
}

function needsReview(users: { attempts: number; completed: number }[]) {
  return users.filter((u) => u.attempts > 0).filter((u) => u.attempts >= 2 && u.completed / u.attempts < .5).length;
}

function ProgressSignal({ tone, title, value, detail }: { tone: "success" | "info" | "warning"; title: string; value: string; detail: string }) {
  const color = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "#3B82F6";
  return <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4"><span className="mb-3 block h-1.5 w-6 rounded-full" style={{ background: color }} /><div className="text-[11px] text-[var(--text-secondary)]">{title}</div><div className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</div><p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{detail}</p></div>;
}
