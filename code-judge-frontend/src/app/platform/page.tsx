"use client";

import "./platform.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Users, Activity, Zap, CheckCircle2, RefreshCw, TrendingUp, Clock3, ListChecks } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { OverviewData, LiveData, ActivityItem, PlatformRange } from "@/services/platform";
import { ChartSkeleton, FeedSkeleton, HeartbeatSkeleton, HeatmapSkeleton, KpiGridSkeleton, SectionCard, EmptyState, ErrorState, StatusDot, fmtInt, fmtPct, fmtDuration, timeAgo } from "@/components/platform/ui";
import { SeriesChart } from "@/components/platform/charts";
import { useAsync } from "@/components/platform/usePlatformAsync";

type RangeKey = PlatformRange | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "custom", label: "Custom" },
];

/* /platform — overview only. Fetches overview + series + growth + live + alerts.
   Every other section lives under its own nested route with its own API call. */

export default function PlatformOverviewPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [customDays, setCustomDays] = useState(14);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [secsAgo, setSecsAgo] = useState<number | null>(null);
  const lastUpdatedRef = useRef<number | null>(null);

  const apiRange: PlatformRange = range === "custom" ? "custom" as PlatformRange : range;
  const days = range === "custom" ? customDays : undefined;
  const rangeKey = range === "custom" ? `custom:${customDays}` : range;

  const overview = useAsync<OverviewData>(() => platformApi.overview(apiRange, days), `overview:${rangeKey}`);
  const series = useAsync(() => platformApi.series(apiRange, days), `series:${rangeKey}`);
  const growth = useAsync(() => platformApi.growth(apiRange, days), `growth:${rangeKey}`);
  const alertsQ = useAsync(() => platformApi.alerts(), "alerts");

  const [live, setLive] = useState<LiveData | null>(null);
  const [liveError, setLiveError] = useState(false);
  const loadLive = () => {
    platformApi
      .live()
      .then((d) => {
        setLive(d);
        setLiveError(false);
        lastUpdatedRef.current = Date.now();
        setSecsAgo(0);
      })
      .catch(() => setLiveError(true));
  };
  useEffect(() => {
    const initial = setTimeout(loadLive, 0);
    const t = setInterval(loadLive, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSecsAgo(lastUpdatedRef.current === null ? null : Math.floor((Date.now() - lastUpdatedRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const refreshAll = () => {
    overview.retry(); series.retry(); growth.retry(); alertsQ.retry(); loadLive();
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const diff = Math.round((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000) + 1;
    if (!Number.isFinite(diff) || diff < 1) return;
    setCustomDays(Math.min(90, Math.max(1, diff)));
    setShowCustom(false);
  };

  const o = overview.data;
  const alerts = alertsQ.data?.items ?? [];

  return (
    <div className="space-y-7">
      {/* Title and range */}
      <div className="flex flex-wrap items-end justify-between gap-5 pt-1">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Platform intelligence
            {live && <span className="flex items-center gap-1.5 normal-case tracking-normal text-[var(--success)]"><span className="pf-pulse h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Live</span>}
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-[34px]">Platform Overview</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)] sm:text-[14px]">
            See how students are learning, taking assessments, and engaging with CodeJudge.
            <span className="ml-2 tabular-nums text-[var(--text-muted)]">Updated {secsAgo === null ? "…" : `${secsAgo}s ago`}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={refreshAll} className="flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] hover:bg-[var(--card-hover)]">
            <RefreshCw size={13} /> Refresh
          </button>
          {showCustom && (
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-[8px] border border-[var(--border)] bg-transparent px-2 py-1.5 text-[var(--text-primary)]" />
              <span>→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-[8px] border border-[var(--border)] bg-transparent px-2 py-1.5 text-[var(--text-primary)]" />
              <button onClick={applyCustom} className="rounded-[8px] border border-[var(--border)] px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--card-hover)]">Apply</button>
            </span>
          )}
          <div className="flex rounded-[8px] border border-[var(--border)] p-0.5" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={range === r.key}
                onClick={() => { setRange(r.key); if (r.key === "custom") setShowCustom(true); }}
                className={`rounded-[6px] px-2.5 py-1.5 text-[12px] ${range === r.key ? "bg-[var(--card-hover)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                {r.label}{r.key === "custom" && range === "custom" ? ` · ${customDays}d` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Platform heartbeat */}
      {overview.loading ? <HeartbeatSkeleton /> : overview.error ? <ErrorState message={overview.error.message} onRetry={overview.retry} /> : o && (
        <HeartbeatPanel overview={o} live={live} points={series.data?.points ?? []} />
      )}

      {/* KPI grid */}
      {overview.loading ? <KpiGridSkeleton /> :
        overview.error ? <ErrorState message={overview.error.message} onRetry={overview.retry} /> : o && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={<Users size={15} />}
            label="Total users"
            value={fmtInt(o.users?.total)}
            trend={o.users && o.users.newMonth > 0 ? `+${fmtInt(o.users.newMonth)} this month` : "all time"}
            visual={<Sparkline values={(growth.data?.points ?? []).map((p) => p.new_users)} />}
          />
          <KpiCard
            icon={<Activity size={15} />}
            label="Active users"
            value={fmtInt(o.active?.last7d)}
            trend={o.active?.changePct == null ? "last 7 days" : `${o.active.changePct >= 0 ? "+" : ""}${o.active.changePct}%`}
            trendUp={(o.active?.changePct ?? 0) >= 0}
            visual={<ProgressRing value={o.users?.total ? ((o.active?.last7d ?? 0) / o.users.total) * 100 : 0} />}
          />
          <KpiCard
            icon={<Zap size={15} />}
            label="Quiz attempts"
            value={fmtInt(o.attempts?.today)}
            trend="today"
            visual={<MiniBars values={(series.data?.points ?? []).slice(-8).map((p) => p.attempts)} />}
          />
          <KpiCard
            icon={<CheckCircle2 size={15} />}
            label="Completion rate"
            value={fmtPct(o.engagement?.completionRate)}
            trend={o.attempts ? `${fmtInt(o.attempts.completed)} completed` : "all time"}
            visual={<ProgressRing value={o.engagement?.completionRate ?? 0} />}
          />
        </div>
      )}

      {/* Attention */}
      <AttentionPanel loading={alertsQ.loading} items={alerts} />

      {/* Main analytics */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,.9fr)]">
        <SectionCard
          title="Student Activity"
          subtitle="How students are engaging with assessments"
        >
          <ActivityChart series={series} />
        </SectionCard>
        <SectionCard
          title="Live now"
          subtitle="realtime"
          right={<span className="pf-pulse inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />}
          id="live"
        >
          {!live && !liveError ? <FeedSkeleton rows={4} stats /> : liveError || !live ? <EmptyState message="Data unavailable" /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LiveStat value={live.online} label="users online" />
                <LiveStat value={live.takingQuizzes} label="taking quizzes" />
                <LiveStat value={live.activeQuizRooms} label="active rooms" />
                <LiveStat value={live.attemptsInProgress} label="attempts in progress" />
              </div>
              <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {live.events.length === 0 && <EmptyState message="Live activity will appear here" detail="New assessment starts, submissions, and student joins will stream in as they happen." />}
                {live.events.slice(0, 5).map((e, i) => (
                  <div key={`${e.kind}-${e.at}-${i}`} className="pf-reveal flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <InitialAvatar name={e.actor} />
                    <span className="min-w-0 truncate text-[var(--text-secondary)]">
                      <b className="font-medium text-[var(--text-primary)]">{e.actor ?? "—"}</b> {liveVerb(e.kind)} {e.object ?? ""}
                    </span>
                    <span className="shrink-0 tabular-nums text-[11px] text-[var(--text-muted)]">{timeAgo(e.at)}</span>
                  </div>
                ))}
              </div>
              <button onClick={loadLive} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Refresh live</button>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <SectionCard id="engagement" title="Engagement rhythm" subtitle="Daily learning signals across the selected range">
          <EngagementHeatmap points={series.data?.points ?? []} loading={series.loading} />
        </SectionCard>
        <InsightMoments overview={o} series={series.data?.points ?? []} />
      </div>

      {/* Recent activity */}
      <ActivityFeed />
    </div>
  );
}

/* Building blocks (overview only) */

function KpiCard({ icon, label, value, trend, trendUp, visual }: {
  icon: React.ReactNode; label: string; value: string; trend: string; trendUp?: boolean; visual?: React.ReactNode;
}) {
  return (
    <div className="pf-card flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-muted)]">{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[27px] font-semibold leading-tight tabular-nums tracking-[-0.03em] text-[var(--text-primary)]">{value}</div>
          <div className={`mt-1 truncate text-[11px] ${trendUp === true ? "text-[var(--success)]" : trendUp === false ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
            {trend}
          </div>
        </div>
        {visual && <div className="w-16 shrink-0">{visual}</div>}
      </div>
    </div>
  );
}

function HeartbeatPanel({ overview, live, points }: { overview: OverviewData; live: LiveData | null; points: Array<{ dau: number; attempts: number }> }) {
  const engaged = overview.active?.today ?? 0;
  return (
    <section className="pf-card pf-grid relative overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-5 py-5 sm:px-6 sm:py-6">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(236,72,153,.08),transparent_68%)]" aria-hidden="true" />
      <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--success)]">
            <span className="pf-pulse h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Platform heartbeat
          </div>
          <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)] sm:text-[23px]">Your learning platform is active</h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">{fmtInt(engaged)} {engaged === 1 ? "student" : "students"}</span> engaged today
            {overview.active?.changePct != null && <span className="ml-2 text-[var(--success)]">{overview.active.changePct >= 0 ? "↑" : "↓"} {Math.abs(overview.active.changePct)}% from the prior period</span>}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
            <HeartbeatStat label="Online now" value={fmtInt(live?.online)} />
            <HeartbeatStat label="Assessing now" value={fmtInt(live?.takingQuizzes)} />
            <HeartbeatStat label="Attempts today" value={fmtInt(overview.attempts?.today)} />
            <HeartbeatStat label="Avg completion" value={fmtPct(overview.engagement?.completionRate)} />
          </div>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] px-3 py-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]"><span>Today&apos;s pulse</span><span>Live signal</span></div>
          <Sparkline values={points.slice(-14).map((p) => Number(p.dau) + Number(p.attempts))} large />
        </div>
      </div>
    </section>
  );
}

function HeartbeatStat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[17px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</div><div className="text-[10px] text-[var(--text-muted)]">{label}</div></div>;
}

function Sparkline({ values, large = false }: { values: number[]; large?: boolean }) {
  const safe = values.length ? values : [0, 0];
  const max = Math.max(1, ...safe);
  const points = safe.map((v, i) => `${(i / Math.max(1, safe.length - 1)) * 100},${38 - (v / max) * 32}`).join(" ");
  return <svg viewBox="0 0 100 42" className={large ? "h-24 w-full" : "h-10 w-full"} preserveAspectRatio="none" aria-hidden="true"><polyline className="pf-chart-path" points={points} fill="none" stroke="#EC4899" strokeWidth={large ? 1.4 : 2} vectorEffect="non-scaling-stroke" /></svg>;
}

function MiniBars({ values }: { values: number[] }) {
  const safe = values.length ? values : [0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...safe);
  return <div className="flex h-9 items-end gap-1" aria-hidden="true">{safe.map((v, i) => <span key={i} className="flex-1 rounded-sm bg-[#3B82F6]/55" style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />)}</div>;
}

function ProgressRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return <div className="ml-auto grid h-10 w-10 place-items-center rounded-full" style={{ background: `conic-gradient(var(--success) ${pct * 3.6}deg, var(--platform-soft-strong) 0)` }} aria-label={`${Math.round(pct)} percent`}><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--card)] text-[8px] tabular-nums text-[var(--text-muted)]">{Math.round(pct)}%</span></div>;
}

function InitialAvatar({ name }: { name: string | null }) {
  const label = (name || "Student").trim();
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--platform-soft)] text-[10px] font-semibold text-[var(--text-secondary)]">{label.slice(0, 2).toUpperCase()}</span>;
}

function LiveStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

function liveVerb(kind: string): string {
  if (kind.includes("completed")) return "completed";
  if (kind.includes("started") || kind.includes("attempt")) return "started";
  if (kind.includes("created")) return "created";
  if (kind.includes("registered")) return "joined";
  return kind.replace(/_/g, " ");
}

function EngagementHeatmap({ points, loading }: { points: Array<{ label: string; dau: number; attempts: number; new_users: number; completed: number }>; loading: boolean }) {
  if (loading) return <HeatmapSkeleton />;
  if (!points.length) return <EmptyState message="Student activity will appear here" detail="Once students begin taking assessments, daily engagement patterns will become visible." />;
  const visible = points.slice(-21);
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
                  return <span key={`${row.key}-${i}`} title={`${p.label} · ${row.label}: ${value}`} className="aspect-square min-h-2 rounded-[3px] border border-[var(--border)] transition-[filter,transform] duration-150 hover:scale-110 hover:brightness-125" style={{ background: `rgba(236,72,153,${0.07 + strength * 0.72})` }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-muted)]"><span>Less</span>{[.08,.2,.36,.55,.78].map((a) => <span key={a} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `rgba(236,72,153,${a})` }} />)}<span>More</span></div>
    </div>
  );
}

function InsightMoments({ overview, series }: {
  overview: OverviewData | null;
  series: Array<{ label: string; attempts: number }>;
}) {
  const peak = series.reduce<{ label: string; attempts: number } | null>((best, p) => !best || p.attempts > best.attempts ? p : best, null);
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      <Moment icon={<TrendingUp size={14} />} label="Peak activity day" value={peak?.label ?? "—"} detail={peak ? `${fmtInt(peak.attempts)} assessment attempts` : "Waiting for activity"} />
      <Moment icon={<Clock3 size={14} />} label="Average assessment time" value={fmtDuration(overview?.engagement?.avgDurationS)} detail="Across completed attempts" />
      <Moment icon={<ListChecks size={14} />} label="Avg attempts per user" value={overview?.engagement?.avgAttemptsPerUser != null ? String(overview.engagement.avgAttemptsPerUser) : "—"} detail="Engagement depth" />
    </div>
  );
}

function Moment({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="pf-card rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"><div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]"><span className="text-[#EC4899]">{icon}</span>{label}</div><div className="mt-2 text-[18px] font-semibold text-[var(--text-primary)]">{value}</div><div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{detail}</div></div>;
}

function AttentionPanel({ loading, items }: { loading: boolean; items: { severity: string; message: string; link: string }[] }) {
  if (loading) return <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 py-3"><div className="pf-skeleton h-2.5 w-28 rounded" /><div className="pf-skeleton mt-2.5 h-3 w-56 max-w-full rounded" /></div>;
  if (!items.length) {
    return (
      <div className="flex items-center gap-2 rounded-[10px] border border-[var(--success)]/25 bg-[var(--success)]/5 px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">
        <CheckCircle2 size={15} className="shrink-0 text-[var(--success)]" />
        Nothing requires your attention
      </div>
    );
  }
  return (
    <div className="rounded-[10px] border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--warning)]">Needs attention</div>
      {items.map((a, i) => (
        <a key={i} href={a.link} className="block py-0.5 text-[13px] text-[var(--text-primary)] hover:underline">
          {a.message}
        </a>
      ))}
    </div>
  );
}

type ActivityMode = "dau" | "wau" | "mau";

function ActivityChart({ series }: {
  series: { data: { points: { label: string; dau: number; new_users: number; attempts: number; completed: number }[] | null } | null; loading: boolean; error: { message: string } | null; retry: () => void };
}) {
  const [mode, setMode] = useState<ActivityMode>("dau");
  const points = useMemo(() => {
    const raw = series.data?.points ?? [];
    const dau = raw.map((p) => Number(p.dau) || 0);
    const trail = (n: number) => raw.map((_, i) => {
      const win = dau.slice(Math.max(0, i - n + 1), i + 1);
      return win.length ? +(win.reduce((a, b) => a + b, 0) / win.length).toFixed(1) : 0;
    });
    const vals = mode === "dau" ? dau : trail(mode === "wau" ? 7 : 30);
    return raw.map((p, i) => ({ label: p.label, active: vals[i] ?? 0, attempts: p.attempts, completed: p.completed }));
  }, [series.data, mode]);

  return (
    <div>
      <div className="mb-2 flex gap-1" role="tablist" aria-label="Active user metric">
        {(["dau", "wau", "mau"] as ActivityMode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            title={m === "dau" ? "Daily active users" : m === "wau" ? "7-day trailing average of DAU" : "30-day trailing average of DAU"}
            className={`rounded-[6px] px-2 py-1 text-[11px] ${mode === m ? "bg-[var(--card-hover)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            {m.toUpperCase()}
          </button>
        ))}
        {mode !== "dau" && <span className="self-center text-[11px] text-[var(--text-muted)]">trailing avg</span>}
      </div>
      {series.loading ? <ChartSkeleton /> : series.error ? <ErrorState message={series.error.message} onRetry={series.retry} /> :
        points.length === 0 ? <EmptyState message="No activity yet" /> : (
        <SeriesChart points={points} keys={[{ key: "active", label: `${mode.toUpperCase()} students` }, { key: "attempts", label: "Attempts" }, { key: "completed", label: "Completed" }]} height={240} />
      )}
    </div>
  );
}

function ActivityFeed() {
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const q = useAsync(() => platformApi.activity(scope, debounced, page, 15), `activity:${scope}:${debounced}:${page}`);
  const filters = ["all", "users", "quizzes", "attempts", "ai", "system", "security"];

  return (
    <SectionCard
      id="activity"
      title="Recent activity"
      right={
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events…"
          className="w-40 rounded-[8px] border border-[var(--border)] bg-transparent px-2 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      }
    >
      <div className="mb-2 flex flex-wrap gap-1">
        {filters.map((s) => (
          <button
            key={s}
            onClick={() => { setScope(s); setPage(1); }}
            className={`rounded-full px-2.5 py-1 text-[11px] ${scope === s ? "bg-[var(--card-hover)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {q.loading ? <FeedSkeleton rows={6} /> : q.error ? <ErrorState message={q.error.message} onRetry={q.retry} /> :
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
                  {e.meta && <div className="pf-mono mt-0.5 text-[var(--text-muted)]">{e.meta}</div>}
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
  );
}
