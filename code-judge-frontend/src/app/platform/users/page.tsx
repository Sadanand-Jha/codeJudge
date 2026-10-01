"use client";

import { platformApi } from "@/services/platform";
import { SectionCard, ChartSkeleton, FeedSkeleton, TableSkeleton, EmptyState, ErrorState, timeAgo } from "@/components/platform/ui";
import { SeriesChart } from "@/components/platform/charts";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { SimpleTable, PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/users — calls /users + /growth only. */
export default function UsersPage() {
  const usersQ = useAsync(() => platformApi.users(), "users");
  const growth = useAsync(() => platformApi.growth("30d"), "growth:30d");

  return (
    <div className="space-y-4">
      <PageHeader title="User analytics" detail="Growth, active students, and creators." />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="User growth" subtitle="New users per day · last 30 days">
          {growth.loading ? <ChartSkeleton heightClass="h-[180px]" /> : growth.error ? <ErrorState message={growth.error.message} onRetry={growth.retry} /> :
            !growth.data?.points ? <EmptyState message="Data unavailable" /> : (
            <SeriesChart
              points={growth.data.points.map((p) => ({ label: String(p.date).slice(5), users: p.new_users }))}
              keys={[{ key: "users", label: "New users" }]}
            />
          )}
        </SectionCard>
        <SectionCard title="Most active students" subtitle="Recent assessment participation, not a leaderboard">
          {usersQ.loading ? <FeedSkeleton rows={6} /> : usersQ.error ? <ErrorState message={usersQ.error.message} onRetry={usersQ.retry} /> : usersQ.data && (
            <ActiveStudents rows={usersQ.data.topUsers.slice(0, 6)} />
          )}
        </SectionCard>
      </div>
      <SectionCard title="Most active creators" subtitle="Teachers by quizzes created">
        {usersQ.loading ? <TableSkeleton rows={6} columns={4} /> : usersQ.error ? <ErrorState message={usersQ.error.message} onRetry={usersQ.retry} /> : usersQ.data && (
          <SimpleTable
            head={["Teacher", "Quizzes", "Published", "Attempts"]}
            rows={usersQ.data.topTeachers.slice(0, 6).map((t) => [t.username ?? `#${t.id}`, String(t.created), String(t.live), String(t.attempts_generated)])}
            empty="No creators yet"
          />
        )}
      </SectionCard>
    </div>
  );
}

function ActiveStudents({ rows }: { rows: { id: number; username: string; attempts: number; completed: number; last_active: string | null }[] }) {
  if (!rows.length) return <EmptyState message="Student participation will appear here" detail="This view fills as learners start and complete assessments." />;
  return <div className="divide-y divide-[var(--border)]">{rows.map((u) => {
    const completion = u.attempts ? Math.round((u.completed / u.attempts) * 100) : 0;
    return <div key={u.id} className="flex items-center gap-3 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--platform-soft)] text-[10px] font-semibold text-[var(--text-secondary)]">{(u.username || "ST").slice(0, 2).toUpperCase()}</span>
      <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium text-[var(--text-primary)]">{u.username || `Student #${u.id}`}</div><div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--platform-soft-strong)]"><div className="h-full rounded-full bg-[var(--success)]/70" style={{ width: `${completion}%` }} /></div></div>
      <div className="w-20 text-right text-[10px] text-[var(--text-muted)]"><div>{u.completed}/{u.attempts} complete</div><div>{timeAgo(u.last_active)}</div></div>
    </div>;
  })}</div>;
}
