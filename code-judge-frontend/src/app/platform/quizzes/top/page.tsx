"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/services/platform";
import { SectionCard, TableSkeleton, EmptyState, ErrorState, fmtDuration, timeAgo } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/quizzes/top — calls /quizzes only. */
export default function TopQuizzesPage() {
  const quizzesQ = useAsync(() => platformApi.quizzes(), "quizzes");
  return (
    <div className="space-y-4">
      <PageHeader title="Top quizzes" detail="Select a row to open quiz details." />
      <SectionCard title="Top quizzes" subtitle="Sorted by engagement">
        {quizzesQ.loading ? <TableSkeleton rows={5} columns={7} /> : quizzesQ.error ? <ErrorState message={quizzesQ.error.message} onRetry={quizzesQ.retry} /> :
          !quizzesQ.data?.top?.length ? <EmptyState message="No quizzes yet" /> : <TopQuizzesTable rows={quizzesQ.data.top} />}
      </SectionCard>
    </div>
  );
}

function TopQuizzesTable({ rows }: {
  rows: { id: number; name: string; code: string; status: string; creator: string | null; attempts: number; completed: number; avg_score: number | null; avg_duration_s: number | null; last_activity: string | null }[];
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "attempts", dir: -1 });
  const sorted = useMemo(() => {
    const arr = [...rows];
    const val = (r: (typeof rows)[number]) => {
      if (sort.key === "attempts") return r.attempts;
      if (sort.key === "completion") return r.attempts ? r.completed / r.attempts : -1;
      if (sort.key === "score") return r.avg_score ?? -1;
      return r.last_activity ? new Date(r.last_activity).getTime() : -1;
    };
    arr.sort((a, b) => (val(a) - val(b)) * sort.dir);
    return arr;
  }, [rows, sort]);
  const toggle = (key: string) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
  return (
    <div className="overflow-x-auto rounded-[8px] border border-[var(--border)]">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Quiz</th>
            <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Creator</th>
            <SortTh label="Attempts" active={sort.key === "attempts"} dir={sort.dir} onClick={() => toggle("attempts")} />
            <SortTh label="Completion" active={sort.key === "completion"} dir={sort.dir} onClick={() => toggle("completion")} />
            <SortTh label="Avg. score" active={sort.key === "score"} dir={sort.dir} onClick={() => toggle("score")} />
            <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Avg. duration</th>
            <SortTh label="Last active" active={sort.key === "recent"} dir={sort.dir} onClick={() => toggle("recent")} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)]">
              <td className="max-w-[220px] px-3 py-3">
                <div className="flex items-center gap-2"><Link href={`/quiz/${r.code}`} className="block min-w-0 truncate text-[var(--text-primary)] hover:underline">{r.name}</Link></div>
                <span className="pf-mono text-[var(--text-muted)]">#{r.id} · {r.code}</span>
              </td>
              <td className="px-3 py-3 text-[var(--text-secondary)]">{r.creator ?? "—"}</td>
              <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">{r.attempts}</td>
              <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">{r.attempts ? `${((r.completed / r.attempts) * 100).toFixed(1)}%` : "—"}</td>
              <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">{r.avg_score == null ? "—" : `${(+r.avg_score).toFixed(1)}%`}</td>
              <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">{fmtDuration(r.avg_duration_s == null ? null : Math.round(r.avg_duration_s))}</td>
              <td className="px-3 py-3 text-[var(--text-secondary)]">{timeAgo(r.last_activity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: 1 | -1; onClick: () => void }) {
  return (
    <th onClick={onClick} className="cursor-pointer px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
      {label}{active ? (dir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );
}
