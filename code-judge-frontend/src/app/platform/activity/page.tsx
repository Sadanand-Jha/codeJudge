"use client";

import { useEffect, useState } from "react";
import { platformApi } from "@/services/platform";
import type { ActivityItem } from "@/services/platform";
import { SectionCard, FeedSkeleton, EmptyState, ErrorState, StatusDot, timeAgo } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/activity — calls /activity only. */
export default function ActivityPage() {
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const q = useAsync(() => platformApi.activity(scope, debounced, page, 20), `activity:${scope}:${debounced}:${page}`);
  const filters = ["all", "users", "quizzes", "attempts", "ai", "system", "security"];

  return (
    <div className="space-y-4">
      <PageHeader title="Recent activity" detail="Filterable platform event feed." />
      <SectionCard
        title="Recent activity"
        right={
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events…"
            className="w-40 rounded-[8px] border border-[var(--border)] bg-transparent px-2 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
        }
      >
        <div className="mb-2 flex flex-wrap gap-1">
          {filters.map((s) => (
            <button key={s} onClick={() => { setScope(s); setPage(1); }}
              className={`rounded-full px-2.5 py-1 text-[11px] ${scope === s ? "bg-[var(--card-hover)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {q.loading ? <FeedSkeleton rows={8} /> : q.error ? <ErrorState message={q.error.message} onRetry={q.retry} /> :
          !q.data?.items.length ? <EmptyState message="No activity yet" /> : (
          <div>
            <div className="divide-y divide-[var(--border)]">
              {q.data.items.map((e: ActivityItem, i: number) => (
                <div key={i} className="flex items-start gap-2.5 py-2 text-[13px]">
                  <StatusDot status={e.type.includes("fail") || e.type.includes("error") ? "down" : "operational"} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[var(--text-primary)]">{e.actor ?? "System"}</span>
                    <span className="text-[var(--text-secondary)]"> {e.type.replace(/_/g, " ")} </span>
                    <span className="text-[var(--text-primary)]">{e.object ?? ""}</span>
                  </div>
                  <span className="shrink-0 tabular-nums text-[11px] text-[var(--text-muted)]">{timeAgo(e.at)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
              <span>Page {page}</span>
              <div className="flex gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-[8px] border border-[var(--border)] px-2 py-1 disabled:opacity-40">Prev</button>
                <button onClick={() => setPage((p) => p + 1)} className="rounded-[8px] border border-[var(--border)] px-2 py-1">Next</button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
