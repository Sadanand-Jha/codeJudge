"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { ActivityItem } from "@/services/platform";
import { SectionCard, FeedSkeleton, EmptyState, ErrorState, StatusDot, timeAgo } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";

const FILTERS = ["all", "users", "quizzes", "attempts", "ai", "system", "security"] as const;

export function ActivityFeed({ id, pageSize = 15 }: { id?: string; pageSize?: number }) {
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const q = useAsync(
    () => platformApi.activity(scope, debounced, page, pageSize),
    `activity:${scope}:${debounced}:${page}:${pageSize}`
  );

  const total = q.data?.total ?? null;
  const totalPages = total === null ? null : Math.max(1, Math.ceil(total / pageSize));
  const hasNext = totalPages === null
    ? (q.data?.items.length ?? 0) >= pageSize
    : page < totalPages;
  const filtering = debounced.length > 0;

  return (
    <SectionCard
      id={id}
      title="Recent activity"
      right={
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--qs-muted)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email or username…"
            aria-label="Filter activity by email or username"
            className="pf-focus w-40 rounded-[12px] border-2 border-[var(--border)] bg-[var(--platform-input)] py-1.5 pl-8 pr-8 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] sm:w-56"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear activity filter"
              className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setScope(s); setPage(1); }}
            data-selected={scope === s}
            aria-pressed={scope === s}
            className="b b-chip"
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtering && (
        <div role="status" aria-live="polite" className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-[11px] text-[var(--qs-muted)]">
          <span>
            Filtering: “{debounced}”
            {q.data && !q.loading && !q.error
              ? ` · ${total ?? q.data.items.length} event${(total ?? q.data.items.length) === 1 ? "" : "s"}`
              : ""}
          </span>
          <button type="button" onClick={() => setSearch("")} className="font-extrabold text-[var(--qs-brand)] hover:underline">
            Clear
          </button>
        </div>
      )}

      {q.loading ? <FeedSkeleton rows={6} /> : q.error ? <ErrorState message={q.error.message} onRetry={q.retry} /> :
        !q.data?.items.length ? (
          <EmptyState
            message={filtering ? "No matching activity" : "No activity yet"}
            detail={filtering ? `No events found for “${debounced}”. Try a different email or username.` : undefined}
          />
        ) : (
        <div>
          <div className="divide-y divide-[var(--border)]">
            {q.data.items.map((e: ActivityItem, i: number) => (
              <div key={`${e.scope}-${e.type}-${e.at ?? ""}-${i}`} className="flex items-start gap-2.5 py-2 text-[13px]">
                <StatusDot status={e.type.includes("fail") || e.type.includes("error") ? "down" : "operational"} />
                <div className="min-w-0 flex-1">
                  <span className="text-[var(--text-primary)]">{e.actor ?? "System"}</span>
                  <span className="text-[var(--text-secondary)]"> {e.type.replace(/_/g, " ")} </span>
                  <span className="text-[var(--text-primary)]">{e.object ?? ""}</span>
                  {e.actor_email && e.actor_email !== e.object && (
                    <span className="block truncate text-[10px] text-[var(--text-muted)]">{e.actor_email}</span>
                  )}
                  {e.meta && <div className="pf-mono mt-0.5 text-[var(--text-muted)]">{e.meta}</div>}
                </div>
                <span className="shrink-0 tabular-nums text-[11px] text-[var(--text-muted)]">{timeAgo(e.at)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
            <span>
              Page {page}{totalPages ? ` of ${totalPages}` : ""}{total !== null ? ` · ${total} events` : ""}
            </span>
            <div className="flex gap-1.5">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="b sm">Prev</button>
              <button type="button" disabled={!hasNext} onClick={() => setPage((p) => p + 1)} className="b sm">Next</button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
