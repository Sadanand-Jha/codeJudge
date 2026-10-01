"use client";

import { platformApi } from "@/services/platform";
import type { AiUsageData } from "@/services/platform";
import { SectionCard, SectionSkeleton, EmptyState, ErrorState, fmtInt } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { SimpleTable, MiniStat, PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/ai — calls /ai only. */
export default function AiPage() {
  const aiQ = useAsync(() => platformApi.ai(), "ai");
  return (
    <div className="space-y-4">
      <PageHeader title="AI usage" detail="Generation, documents, assistance." />
      <SectionCard title="AI usage" subtitle="Generation, documents, assistance">
        {aiQ.loading ? <SectionSkeleton rows={2} /> : aiQ.error ? <ErrorState message={aiQ.error.message} onRetry={aiQ.retry} /> : (
          <AiUsagePanel data={aiQ.data} />
        )}
      </SectionCard>
    </div>
  );
}

function AiUsagePanel({ data }: { data: AiUsageData | null }) {
  if (!data?.available) return <EmptyState message="AI telemetry is not available" detail={data?.reason ?? "Apply the observability migration to begin collecting AI request usage."} />;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><MiniStat label="Today" value={fmtInt(data.requestsToday)} /><MiniStat label="30-day requests" value={fmtInt(data.requestsMonth)} /><MiniStat label="Tokens today" value={fmtInt(data.tokens)} /><MiniStat label="Avg latency" value={`${fmtInt(data.avgLatencyMs)} ms`} /><MiniStat label="Cost today" value={data.estimatedCost == null ? "—" : `$${data.estimatedCost.toFixed(4)}`} /></div>
    <SimpleTable head={["Provider / model", "Requests", "Tokens", "Failures"]} rows={(data.byModel ?? []).map((row) => [`${row.provider} / ${row.model}`, fmtInt(row.requests), fmtInt(row.tokens), fmtInt(row.failures)])} empty="No AI requests recorded yet" />
    {!!data.byEndpoint?.length && <SimpleTable head={["Endpoint", "Requests", "Tokens", "Failures"]} rows={data.byEndpoint.map((row) => [row.endpoint, fmtInt(row.requests), fmtInt(row.tokens), fmtInt(row.failures)])} empty="No endpoint usage yet" />}
    {!!data.byUser?.length && <SimpleTable head={["User", "Requests", "Tokens"]} rows={data.byUser.map((row) => [row.username, fmtInt(row.requests), fmtInt(row.tokens)])} empty="No user usage yet" />}
    <p className="text-[10px] text-[var(--text-muted)]">Cost requires AI_INPUT_COST_PER_1M_TOKENS and AI_OUTPUT_COST_PER_1M_TOKENS; it is never guessed.</p>
  </div>;
}
