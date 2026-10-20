"use client";

import { useEffect, useState } from "react";
import { Gauge, Network, Search, X } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { PlatformRange } from "@/services/platform";
import { SectionCard, SectionSkeleton, EmptyState, ErrorState, fmtInt, fmtPct, timeAgo } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { MiniStat, SimpleTable } from "@/components/platform/subpage-blocks";

/* /platform/observability — calls /observability (+ /requests/:id on inspect) only. */
export default function ObservabilityPage() {
  const [range, setRange] = useState<PlatformRange>("7d");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const query = useAsync(
    () => platformApi.observability(range, undefined, { search: debouncedSearch }),
    `observability:${range}:${debouncedSearch}`
  );
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const data = query.data;
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge size={17} className="text-[var(--brand)]" />
            <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)]">API observability</h1>
          </div>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Requests, latency, failures, active sessions, and trace-level debugging from production traffic.</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.activeWindowMinutes && <span className="rounded-full border-2 border-[var(--border)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--text-muted)]">Online = active in {data.activeWindowMinutes}m</span>}
          <div className="flex gap-1.5" role="tablist" aria-label="Range">
            {(["today", "7d", "30d", "90d"] as PlatformRange[]).map((r) => (
              <button key={r} role="tab" aria-selected={range === r} data-selected={range === r} onClick={() => setRange(r)}
                className="b b-chip sm">{r}</button>
            ))}
          </div>
        </div>
      </div>
      {query.loading && !data ? <SectionSkeleton rows={6} /> : query.error ? <ErrorState message={query.error.message} onRetry={query.retry} /> : !data?.available ? (
        <EmptyState message="Observability migration is not applied" detail={data?.reason ?? "Apply the platform observability migration to start collecting real request telemetry."} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MiniStat label="Requests" value={fmtInt(summary?.requests)} />
            <MiniStat label="Online now" value={fmtInt(summary?.onlineUsers)} />
            <MiniStat label="Error rate" value={fmtPct(summary?.errorRate)} />
            <MiniStat label="Average" value={`${fmtInt(summary?.avgLatencyMs)} ms`} />
            <MiniStat label="P95 latency" value={`${fmtInt(summary?.p95Ms)} ms`} />
            <MiniStat label="P99 latency" value={`${fmtInt(summary?.p99Ms)} ms`} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Slow endpoints" subtitle="Ranked by p95 latency">
              <SimpleTable
                head={["Endpoint", "Method", "Requests", "Average", "P95"]}
                rows={(data.slowEndpoints ?? []).map((row) => [row.endpoint, row.method, fmtInt(row.requests), `${fmtInt(row.avg_ms)} ms`, `${fmtInt(row.p95_ms)} ms`])}
                empty="No request samples yet"
              />
            </SectionCard>
            <SectionCard title="Failing endpoints" subtitle="Routes with unsuccessful responses">
              <SimpleTable
                head={["Endpoint", "Method", "Requests", "Failures", "Rate"]}
                rows={(data.failingEndpoints ?? []).map((row) => [row.endpoint, row.method, fmtInt(row.requests), fmtInt(row.failures), fmtPct(row.error_rate)])}
                empty="No failures in this range"
              />
            </SectionCard>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <SectionCard
              title="Recent requests"
              subtitle={query.loading ? "Updating results…" : debouncedSearch ? `Filtered by “${debouncedSearch}”` : "Select any request to inspect its trace and redacted metadata"}
              right={
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Email or username…"
                    aria-label="Filter requests by email or username"
                    className="pf-focus w-40 rounded-[12px] border-2 border-[var(--border)] bg-[var(--platform-input)] py-1.5 pl-8 pr-8 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] sm:w-56"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear request filter"
                      className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              }
            >
              <div className={query.loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={query.loading}>
                {!data.recent?.length ? (
                  <EmptyState
                    message={debouncedSearch ? "No matching requests" : "No requests recorded yet"}
                    detail={debouncedSearch ? `No requests found for “${debouncedSearch}”. Try a different email or username.` : undefined}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-[11px]">
                      <thead className="text-[10px] uppercase tracking-[.08em] text-[var(--text-muted)]"><tr>{["Status", "Method", "Endpoint", "User", "Duration", "Time", ""].map((h) => <th key={h} className="border-b border-[var(--border)] px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {data.recent.map((row) => <tr key={row.request_id} className="hover:bg-[var(--card-hover)]">
                          <td className={`px-2 py-2 font-semibold tabular-nums ${row.success ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{row.status_code}</td>
                          <td className="px-2 py-2 font-medium text-[var(--text-primary)]">{row.method}</td>
                          <td className="max-w-[260px] truncate px-2 py-2 text-[var(--text-secondary)]" title={row.endpoint}>{row.route_template || row.endpoint}</td>
                          <td className="max-w-[180px] px-2 py-2 text-[var(--text-secondary)]">
                            <span className="block truncate">{row.username || "Anonymous"}</span>
                            {row.email && <span className="block truncate text-[10px] text-[var(--text-muted)]">{row.email}</span>}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-[var(--text-secondary)]">{row.duration_ms} ms</td>
                          <td className="px-2 py-2 whitespace-nowrap text-[var(--text-muted)]">{timeAgo(row.started_at)}</td>
                          <td className="px-2 py-2"><button onClick={() => setSelectedRequest(row.request_id)} className="b sm">Inspect</button></td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SectionCard>
            <div className="space-y-4">
              <SectionCard title="Active users" subtitle="Current authenticated sessions">
                {!data.activeUsers?.length ? <EmptyState message="No active users" /> : <div className="space-y-2">
                  {data.activeUsers.slice(0, 8).map((user) => <div key={user.user_id} className="flex items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--border)] px-3 py-2">
                    <div className="min-w-0"><p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{user.username}</p><p className="truncate text-[10px] text-[var(--text-muted)]">{user.browser} · {user.os} · {user.device_type}</p></div>
                    <span className="shrink-0 text-[10px] text-[var(--success)]">{timeAgo(user.last_seen_at)}</span>
                  </div>)}
                </div>}
              </SectionCard>
              <SectionCard title="Top traffic users" subtitle="Requests in selected range">
                <SimpleTable head={["User", "Requests", "Failures"]} rows={(data.topUsers ?? []).slice(0, 8).map((user) => [user.username, fmtInt(user.requests), fmtInt(user.failures)])} empty="No user traffic yet" />
              </SectionCard>
            </div>
          </div>
        </>
      )}
      {selectedRequest && <RequestInspector requestId={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    </div>
  );
}

function RequestInspector({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const detail = useAsync(() => platformApi.requestDetail(requestId), requestId);
  const log = detail.data?.log;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Request inspector">
      <button className="absolute inset-0 bg-black/55" onClick={onClose} aria-label="Close request inspector" />
      <aside className="relative h-full w-full max-w-[680px] overflow-y-auto border-l-2 border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--brand)]">Request inspector</p><h3 className="mt-1 break-all text-[15px] font-extrabold tracking-tight text-[var(--text-primary)]">{requestId}</h3></div>
          <button onClick={onClose} className="b b-icon sm b-ghost" aria-label="Close"><X size={15} /></button>
        </div>
        {detail.loading ? <div className="mt-5"><SectionSkeleton rows={8} /></div> : detail.error ? <div className="mt-5"><ErrorState message={detail.error.message} onRetry={detail.retry} /></div> : log && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Status" value={String(log.status_code)} />
              <MiniStat label="Method" value={log.method} />
              <MiniStat label="Duration" value={`${log.duration_ms} ms`} />
              <MiniStat label="User" value={log.username || "Anonymous"} />
            </div>
            <div className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--card)] p-4"><h4 className="mb-3 flex items-center gap-2 text-[12px] font-extrabold tracking-tight text-[var(--text-primary)]"><Network size={13} />Request</h4>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-[8px] bg-[var(--platform-input)] p-3 text-[10px] text-[var(--text-secondary)]">{JSON.stringify({ endpoint: log.endpoint, route: log.route_template, trace: log.trace_id, ip: log.ip_address, agent: log.user_agent, error: log.error_message }, null, 2)}</pre>
            </div>
            <div className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--card)] p-4"><h4 className="mb-3 text-[12px] font-extrabold tracking-tight text-[var(--text-primary)]">Redacted metadata</h4>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-[8px] bg-[var(--platform-input)] p-3 text-[10px] text-[var(--text-secondary)]">{JSON.stringify(detail.data?.metadata ?? {}, null, 2)}</pre>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
