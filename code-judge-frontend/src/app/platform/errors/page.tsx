"use client";

import { AlertTriangle } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { PlatformErrorsData } from "@/services/platform";
import { SectionCard, SectionSkeleton, EmptyState, ErrorState, fmtInt, timeAgo } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { MiniStat, PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/errors — calls /errors only. */
export default function ErrorsPage() {
  const errorsQ = useAsync(() => platformApi.errors(), "errors");
  return (
    <div className="space-y-4">
      <PageHeader title="Errors" detail="Failures and warnings requiring investigation." />
      <SectionCard title="Issues" subtitle="Failures and warnings requiring investigation">
        {errorsQ.loading ? <SectionSkeleton rows={3} /> : errorsQ.error ? <ErrorState message={errorsQ.error.message} onRetry={errorsQ.retry} /> : (
          <ErrorsPanel data={errorsQ.data} />
        )}
      </SectionCard>
    </div>
  );
}

function ErrorsPanel({ data }: { data: PlatformErrorsData | null }) {
  if (!data?.available) return <EmptyState message="Error telemetry is not available" detail={data?.reason ?? "Apply the observability migration to begin grouping server errors."} />;
  if (!data.items.length) return <EmptyState message="No server errors recorded" detail="New 5xx failures will be grouped here by fingerprint." />;
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3"><MiniStat label="Errors today" value={fmtInt(data.errorsToday)} /><MiniStat label="Unresolved groups" value={fmtInt(data.unresolved)} /></div>
    <div className="space-y-2">{data.items.slice(0, 20).map((item) => <details key={item.error_id} className="group rounded-[9px] border border-[var(--border)] px-3 py-2.5"><summary className="flex cursor-pointer list-none items-start justify-between gap-3"><div className="min-w-0"><p className="text-[12px] font-medium text-[var(--text-primary)]">{item.error_type}: {item.message}</p><p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">{item.method} {item.endpoint || "unknown endpoint"} · {item.status_code ?? "—"} · last seen {timeAgo(item.last_seen_at)}</p></div><span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--danger)]/10 px-2 py-1 text-[10px] font-semibold text-[var(--danger)]"><AlertTriangle size={10} />{fmtInt(item.occurrence_count)}</span></summary><div className="mt-3 border-t border-[var(--border)] pt-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--text-muted)]">Exact API reason</p><p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-[var(--danger)]">{item.message}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]"><span>Code: {item.error_code || "not supplied"}</span><span>Request: {item.request_id || "unavailable"}</span><span>Trace: {item.trace_id || "unavailable"}</span></div>{item.stack_trace && <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-[7px] bg-[var(--platform-input)] p-2 text-[9px] leading-4 text-[var(--text-secondary)]">{item.stack_trace}</pre>}</div></details>)}</div>
  </div>;
}
