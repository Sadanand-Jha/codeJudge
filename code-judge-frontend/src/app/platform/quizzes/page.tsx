"use client";

import Link from "next/link";
import { platformApi } from "@/services/platform";
import { SectionCard, ChartSkeleton, MiniStatsSkeleton, EmptyState, ErrorState, fmtInt, timeAgo } from "@/components/platform/ui";
import { SeriesChart } from "@/components/platform/charts";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { MiniStat, PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/quizzes — calls /quizzes (+ /series for the mini chart) only. */
export default function QuizzesPage() {
  const quizzesQ = useAsync(() => platformApi.quizzes(), "quizzes");
  const series = useAsync(() => platformApi.series("7d"), "series:7d");

  return (
    <div className="space-y-4">
      <PageHeader title="Quiz analytics" detail="How assessments are being created and consumed." />
      {quizzesQ.loading ? <div className="space-y-4"><MiniStatsSkeleton /><div className="grid gap-4 lg:grid-cols-2"><SectionCard title="Attempts over time" subtitle="Quiz attempts"><ChartSkeleton heightClass="h-[170px]" /></SectionCard></div></div>
        : quizzesQ.error ? <ErrorState message={quizzesQ.error.message} onRetry={quizzesQ.retry} /> : quizzesQ.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="Total quizzes" value={fmtInt(quizzesQ.data.byStatus?.reduce((s, x) => s + x.n, 0) ?? null)} />
            {(quizzesQ.data.byStatus ?? []).map((s) => (
              <MiniStat key={s.status} label={statusLabel(s.status)} value={fmtInt(s.n)} />
            ))}
            <MiniStat label="Attempts" value={fmtInt(quizzesQ.data.stats?.total)} />
            <MiniStat label="Completed" value={fmtInt(quizzesQ.data.stats?.completed)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Attempts over time" subtitle="Quiz attempts · last 7 days">
              {series.loading ? <ChartSkeleton heightClass="h-[170px]" /> : series.error ? <ErrorState message={series.error.message} onRetry={series.retry} /> : (
                <SeriesChart points={(series.data?.points ?? []).map((p) => ({ label: p.label, attempts: p.attempts }))} keys={[{ key: "attempts", label: "Attempts" }]} height={170} />
              )}
            </SectionCard>
            <SectionCard title="Assessment Journey" subtitle="How students move from opening to completion">
              {quizzesQ.data.funnel ? (
                <AssessmentJourney stages={[
                  { label: "Opened", value: quizzesQ.data.funnel.opened },
                  { label: "Started", value: quizzesQ.data.funnel.started },
                  { label: "Answered", value: quizzesQ.data.funnel.answered },
                  { label: "Submitted", value: quizzesQ.data.funnel.submitted },
                  { label: "Completed", value: quizzesQ.data.funnel.completed },
                ]} />
              ) : <EmptyState message="Assessment journeys will appear here" detail="Once students begin assessments, each stage of the completion path will be visible." />}
            </SectionCard>
          </div>
          <SectionCard title="Top quizzes" subtitle="Select a row to open quiz details — full table lives at Quizzes / Top">
            {!quizzesQ.data.top?.length ? <EmptyState message="No quizzes yet" /> : (
              <div className="divide-y divide-[var(--border)]">
                {quizzesQ.data.top.slice(0, 5).map((r) => (
                  <Link key={r.id} href={`/quiz/${r.code}`} className="flex items-center justify-between gap-3 py-2.5 text-[13px] hover:underline">
                    <span className="min-w-0 truncate text-[var(--text-primary)]">{r.name}</span>
                    <span className="shrink-0 tabular-nums text-[var(--text-muted)]">{r.attempts} attempts · {timeAgo(r.last_activity)}</span>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/platform/quizzes/top" className="mt-3 inline-block text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Open full top-quizzes table →</Link>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function statusLabel(s: string): string {
  const t = s.toLowerCase();
  if (t === "live") return "Published";
  if (t === "scheduled") return "Scheduled";
  if (t === "ended") return "Ended";
  if (t === "draft") return "Draft";
  return s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
}

function AssessmentJourney({ stages }: { stages: { label: string; value: number | null }[] }) {
  const first = stages[0]?.value ?? 0;
  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct = stage.value === null || first === 0 ? null : Math.max(0, Math.min(100, (stage.value / first) * 100));
        return (
          <div key={stage.label}>
            <div className="mb-1.5 flex items-end justify-between gap-3"><span className="text-[12px] text-[var(--text-secondary)]"><b className="mr-2 font-medium text-[var(--text-muted)]">{String(i + 1).padStart(2, "0")}</b>{stage.label}</span><span className="text-right text-[11px] tabular-nums text-[var(--text-muted)]">{fmtInt(stage.value)} {pct != null && `· ${pct.toFixed(0)}%`}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--platform-soft-strong)]"><div className="h-full origin-left rounded-full bg-[#EC4899]/80" style={{ width: `${pct ?? 0}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
