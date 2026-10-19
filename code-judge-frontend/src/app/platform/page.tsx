"use client";

import "./platform.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Users, Activity, Zap, CheckCircle2, RefreshCw, TrendingUp, Clock3, ListChecks, MessageSquareText, Star } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { OverviewData, LiveData, ActivityItem, PlatformRange, PlatformFeedbackData } from "@/services/platform";
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
  const feedbackQ = useAsync<PlatformFeedbackData>(() => platformApi.feedback(), "feedback");
  const usersQ = useAsync(() => platformApi.users(), "users");
  const quizzesQ = useAsync(() => platformApi.quizzes(), "quizzes");

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
    overview.retry(); series.retry(); growth.retry(); alertsQ.retry(); feedbackQ.retry(); usersQ.retry(); quizzesQ.retry(); loadLive();
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
    <div className="space-y-5">
      {/* Title and range */}
      <div className="flex flex-wrap items-end justify-between gap-5 pt-1">
        <div>
          <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
            Platform intelligence
            {live && <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)] px-2 py-0.5 text-[11px] text-[var(--qs-ok)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-ok)]" /> Live</span>}
          </p>
          <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-tight text-[var(--qs-ink)] sm:text-[40px]">Platform overview</h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[var(--qs-muted)]">
            See how students are learning, taking assessments, and engaging with QuizSupport.
            <span className="ml-2 tabular-nums">Updated {secsAgo === null ? "…" : `${secsAgo}s ago`}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={refreshAll} className="b sm">
            <RefreshCw size={13} /> Refresh
          </button>
          {showCustom && (
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--qs-muted)]">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-2 py-1.5 text-[12px] text-[var(--qs-ink)]" />
              <span>→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-2 py-1.5 text-[12px] text-[var(--qs-ink)]" />
              <button onClick={applyCustom} className="b sm">Apply</button>
            </span>
          )}
          <div className="b-seg" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={range === r.key}
                onClick={() => { setRange(r.key); if (r.key === "custom") setShowCustom(true); }}
                className="b sm"
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

      {/* KPI grid — original data: users from /overview+/users, quizzes from /overview+/quizzes */}
      {overview.loading ? <KpiGridSkeleton /> :
        overview.error ? <ErrorState message={overview.error.message} onRetry={overview.retry} /> : o && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={<Users size={15} />}
            label="Total students"
            value={fmtInt(o.users?.total)}
            trend={o.users ? `+${fmtInt(o.users.newToday)} today · +${fmtInt(o.users.newWeek)} this week` : "all time"}
            trendUp={(o.users?.newToday ?? 0) > 0}
            visual={<Sparkline values={(growth.data?.points ?? []).map((p) => p.new_users)} />}
          />
          <KpiCard
            icon={<Activity size={15} />}
            label="Active students"
            value={fmtInt(o.active?.last7d)}
            trend={o.active?.changePct == null ? "last 7 days" : `${o.active.changePct >= 0 ? "+" : ""}${o.active.changePct}%`}
            trendUp={(o.active?.changePct ?? 0) >= 0}
            visual={<ProgressRing value={o.users?.total ? ((o.active?.last7d ?? 0) / o.users.total) * 100 : 0} />}
          />
          <KpiCard
            icon={<Zap size={15} />}
            label="Quizzes created"
            value={fmtInt(o.quizzes?.total)}
            trend={o.quizzes ? `+${fmtInt(o.quizzes.createdToday)} today` : "all time"}
            trendUp={(o.quizzes?.createdToday ?? 0) > 0}
            visual={<MiniBars values={(growth.data?.points ?? []).map((p) => p.new_quizzes)} />}
          />
          <KpiCard
            icon={<CheckCircle2 size={15} />}
            label="Quiz attempts"
            value={fmtInt(o.attempts?.total)}
            trend={o.attempts ? `${fmtInt(o.attempts.today)} today · ${fmtInt(o.attempts.completed)} completed` : "all time"}
            trendUp={(o.attempts?.today ?? 0) > 0}
            visual={<ProgressRing value={o.engagement?.completionRate ?? 0} />}
          />
        </div>
      )}

      {/* Attention */}
      <AttentionPanel loading={alertsQ.loading} items={alerts} />

      <SectionCard title="Learner feedback" subtitle="Anonymous signals from completed quizzes">
        <FeedbackSnapshot query={feedbackQ} />
      </SectionCard>

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
              <button onClick={loadLive} className="b b-ghost sm">Refresh live</button>
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

      {/* Students + quizzes — original data from /users and /quizzes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Students today"
          subtitle={o?.users ? `${fmtInt(o.users.newToday)} joined today · ${fmtInt(o.users.newWeek)} this week · ${fmtInt(o.users.newMonth)} this month` : "Who joined recently"}
          right={<a href="/platform/users" className="b sm">All students →</a>}
        >
          {usersQ.loading ? <FeedSkeleton rows={5} /> : usersQ.error ? <ErrorState message={usersQ.error.message} onRetry={usersQ.retry} /> : usersQ.data && (
            <StudentsSnapshot rows={usersQ.data.topUsers.slice(0, 5)} total={o?.users?.total ?? usersQ.data.total} newToday={o?.users?.newToday ?? null} />
          )}
        </SectionCard>
        <SectionCard
          title="Quizzes today"
          subtitle={o?.quizzes ? `${fmtInt(o.quizzes.createdToday)} created today · ${fmtInt(o.quizzes.total)} total` : "What teachers published recently"}
          right={<a href="/platform/quizzes" className="b sm">All quizzes →</a>}
        >
          {quizzesQ.loading ? <FeedSkeleton rows={5} /> : quizzesQ.error ? <ErrorState message={quizzesQ.error.message} onRetry={quizzesQ.retry} /> : quizzesQ.data && (
            <QuizzesSnapshot top={quizzesQ.data.top.slice(0, 5)} total={o?.quizzes?.total ?? null} createdToday={o?.quizzes?.createdToday ?? null} />
          )}
        </SectionCard>
      </div>

      {/* Recent activity */}
      <ActivityFeed />
    </div>
  );
}

function FeedbackSnapshot({ query }: { query: ReturnType<typeof useAsync<PlatformFeedbackData>> }) {
  if (query.loading) return <FeedSkeleton rows={2} stats />;
  if (query.error) return <ErrorState message={query.error.message} onRetry={query.retry} />;
  const data = query.data;
  if (!data || data.unavailable) return <EmptyState message="Feedback is unavailable" />;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,.7fr)_minmax(0,1.3fr)]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ["Quiz", data.averages.quiz],
          ["Questions", data.averages.questions],
          ["Teacher", data.averages.teacher],
          ["Platform", data.averages.platform],
        ] as const).map(([label, value]) => (
          <div key={label} className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--platform-input)] px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[18px] font-extrabold text-[var(--text-primary)]"><Star size={13} className="fill-[var(--sun)] text-[var(--sun)]" />{value?.toFixed(1) ?? "—"}</div>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {!data.recent.length ? <EmptyState message="No written feedback yet" detail={`${data.responses} rating responses received.`} /> : data.recent.slice(0, 3).map((item) => (
          <div key={item.id} className="flex gap-2.5 rounded-[12px] border-2 border-[var(--border)] px-3 py-2.5">
            <MessageSquareText size={13} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
            <div className="min-w-0"><p className="line-clamp-2 text-[12px] leading-5 text-[var(--text-primary)]">{item.feedback}</p><p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">{item.quiz_name} · {timeAgo(item.created_at)} · anonymous</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Building blocks (overview only) */

function KpiCard({ icon, label, value, trend, trendUp, visual, highlight }: {
  icon: React.ReactNode; label: string; value: string; trend: string; trendUp?: boolean; visual?: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={highlight
      ? "flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-4"
      : "flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-4"}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[32px] font-extrabold leading-none tabular-nums tracking-tight text-[var(--qs-ink)]">{value}</div>
          <div className={`mt-1 truncate text-[12px] font-bold ${trendUp === true ? "text-[var(--qs-ok)]" : trendUp === false ? "text-[var(--qs-bad)]" : "text-[var(--qs-muted)]"}`}>
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
    <div className="qs-offset">
    <section className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-7" aria-label="Platform heartbeat">
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
            <span className="h-2 w-2 rounded-full bg-[var(--qs-ok)]" /> Platform heartbeat
          </p>
          <h2 className="text-[24px] font-extrabold leading-[1.05] tracking-tight text-[var(--qs-ink)] sm:text-[30px]">Your learning platform is active</h2>
          <p className="mt-1.5 text-[14px] text-[var(--qs-muted)]">
            <span className="font-bold tabular-nums text-[var(--qs-ink)]">{fmtInt(engaged)} {engaged === 1 ? "student" : "students"}</span> engaged today
            {overview.active?.changePct != null && <span className="ml-2 font-bold text-[var(--qs-ok)]">{overview.active.changePct >= 0 ? "↑" : "↓"} {Math.abs(overview.active.changePct)}% from the prior period</span>}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
            <HeartbeatStat label="Online now" value={fmtInt(live?.online)} />
            <HeartbeatStat label="Assessing now" value={fmtInt(live?.takingQuizzes)} />
            <HeartbeatStat label="Attempts today" value={fmtInt(overview.attempts?.today)} />
            <HeartbeatStat label="Avg completion" value={fmtPct(overview.engagement?.completionRate)} />
          </div>
        </div>
        <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-4">
          <div className="mb-2 flex items-center justify-between text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]"><span>Today&apos;s pulse</span><span>Live signal</span></div>
          <Sparkline values={points.slice(-14).map((p) => Number(p.dau) + Number(p.attempts))} large />
        </div>
      </div>
    </section>
    </div>
  );
}

function HeartbeatStat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[20px] font-extrabold tabular-nums tracking-tight text-[var(--qs-ink)]">{value}</div><div className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{label}</div></div>;
}

function Sparkline({ values, large = false }: { values: number[]; large?: boolean }) {
  const safe = values.length ? values : [0, 0];
  const max = Math.max(1, ...safe);
  const points = safe.map((v, i) => `${(i / Math.max(1, safe.length - 1)) * 100},${38 - (v / max) * 32}`).join(" ");
  return <svg viewBox="0 0 100 42" className={large ? "h-24 w-full" : "h-10 w-full"} preserveAspectRatio="none" aria-label="Trend"><polyline points={points} fill="none" stroke="var(--qs-brand)" strokeWidth={large ? 1.4 : 2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MiniBars({ values }: { values: number[] }) {
  const safe = values.length ? values : [0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...safe);
  const top = Math.max(...safe);
  return <div className="flex h-9 items-end gap-1" aria-hidden="true">{safe.map((v, i) => <span key={i} className={`flex-1 rounded-t-[6px] border-x-2 border-t-2 border-[var(--qs-ink)] ${v === top ? "bg-[var(--qs-sun)]" : "bg-[var(--qs-brand)]"}`} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />)}</div>;
}

function ProgressRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return <div className="ml-auto grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--qs-ink)]" style={{ background: `conic-gradient(var(--qs-ok) ${pct * 3.6}deg, var(--qs-line) 0)` }} aria-label={`${Math.round(pct)} percent`}><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--qs-surface)] text-[8px] font-bold tabular-nums text-[var(--qs-ink)]">{Math.round(pct)}%</span></div>;
}

function InitialAvatar({ name }: { name: string | null }) {
  const label = (name || "Student").trim();
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[10px] font-extrabold text-[var(--qs-on-brand)]">{label.slice(0, 2).toUpperCase()}</span>;
}

function LiveStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">
        <span className="inline-block h-2 w-2 rounded-full border border-[var(--qs-ink)] bg-[var(--qs-ok)]" aria-hidden="true" />
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--qs-muted)]">{label}</div>
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
              <span className="text-[12px] text-[var(--qs-muted)]">{row.label}</span>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(5px, 1fr))` }}>
                {visible.map((p, i) => {
                  const value = Number(p[row.key]) || 0;
                  const strength = value / max;
                  const bg = strength <= 0 ? "var(--qs-bg)" : strength < 0.25 ? "#EFE8FD" : strength < 0.5 ? "#D9CCF9" : strength < 0.75 ? "#A988F5" : strength < 1 ? "var(--qs-brand)" : "var(--qs-ink)";
                  return <span key={`${row.key}-${i}`} title={`${p.label} · ${row.label}: ${value}`} className="aspect-square min-h-2 rounded-[4px] border-2 border-[var(--qs-ink)]" style={{ background: bg }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] font-bold text-[var(--qs-muted)]"><span>Less</span>{["var(--qs-bg)", "#EFE8FD", "#D9CCF9", "#A988F5", "var(--qs-brand)"].map((bg) => <span key={bg} className="h-2.5 w-2.5 rounded-[4px] border-2 border-[var(--qs-ink)]" style={{ background: bg }} />)}<span>More</span></div>
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
  return <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5"><div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]"><span className="grid h-7 w-7 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]">{icon}</span>{label}</div><div className="mt-2 font-extrabold tracking-tight text-[var(--qs-ink)]" style={{ fontSize: "clamp(18px,2vw,22px)" }}>{value}</div><div className="mt-0.5 text-[12px] text-[var(--qs-muted)]">{detail}</div></div>;
}

function AttentionPanel({ loading, items }: { loading: boolean; items: { severity: string; message: string; link: string }[] }) {
  if (loading) return <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3"><div className="pf-skeleton h-2.5 w-28 rounded" /><div className="pf-skeleton mt-2.5 h-3 w-56 max-w-full rounded" /></div>;
  if (!items.length) {
    return (
      <div className="flex items-center gap-2 rounded-[16px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)]">
        <CheckCircle2 size={15} className="shrink-0 text-[var(--qs-ok)]" />
        Nothing requires your attention
      </div>
    );
  }
  return (
    <div className="rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 py-3">
      <div className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-warn)]">Needs attention</div>
      {items.map((a, i) => (
        <a key={i} href={a.link} className="block py-0.5 text-[13px] font-bold text-[var(--qs-ink)] hover:text-[var(--qs-brand)] hover:underline">
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
      <div className="mb-2 flex flex-wrap items-center gap-2" role="tablist" aria-label="Active user metric">
        <span className="b-seg">
          {(["dau", "wau", "mau"] as ActivityMode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              title={m === "dau" ? "Daily active users" : m === "wau" ? "7-day trailing average of DAU" : "30-day trailing average of DAU"}
              className="b sm"
            >
              {m.toUpperCase()}
            </button>
          ))}
        </span>
        {mode !== "dau" && <span className="self-center text-[11px] text-[var(--text-muted)]">trailing avg</span>}
      </div>
      {series.loading ? <ChartSkeleton /> : series.error ? <ErrorState message={series.error.message} onRetry={series.retry} /> :
        points.length === 0 ? <EmptyState message="No activity yet" /> : (
        <SeriesChart points={points} keys={[{ key: "active", label: `${mode.toUpperCase()} students` }, { key: "attempts", label: "Attempts" }, { key: "completed", label: "Completed" }]} height={240} />
      )}
    </div>
  );
}

function StudentsSnapshot({ rows, total, newToday }: { rows: { id: number; username: string; attempts: number; completed: number; last_active: string | null }[]; total: number | null; newToday: number | null }) {
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-2 text-center">
          <div className="text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">{fmtInt(total)}</div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ink)]">Total</div>
        </div>
        <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-center">
          <div className="text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">{fmtInt(newToday)}</div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Today</div>
        </div>
        <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-center">
          <div className="text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">{fmtInt(rows.length ? rows.reduce((s, u) => s + (u.attempts || 0), 0) : null)}</div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Attempts</div>
        </div>
      </div>
      {!rows.length ? <EmptyState message="No students yet" /> : (
        <div className="divide-y divide-[var(--qs-line)] border-t-2 border-[var(--qs-line)]">
          {rows.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5 text-[13px]">
              <InitialAvatar name={u.username} />
              <span className="min-w-0 flex-1 truncate"><b className="font-bold text-[var(--qs-ink)]">{u.username || `Student #${u.id}`}</b> <span className="text-[var(--qs-muted)]">· {u.completed}/{u.attempts} done</span></span>
              <span className="shrink-0 tabular-nums text-[11px] text-[var(--qs-muted)]">{timeAgo(u.last_active)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuizzesSnapshot({ top, total, createdToday }: { top: { id: number; name: string; code: string; attempts: number; last_activity: string | null }[]; total: number | null; createdToday: number | null }) {
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-center">
          <div className="text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">{fmtInt(total)}</div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Total</div>
        </div>
        <div className="rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-2 text-center">
          <div className="text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">{fmtInt(createdToday)}</div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ink)]">Today</div>
        </div>
        <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-center">
          <div className="text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">{fmtInt(top.length ? top.reduce((s, q) => s + (q.attempts || 0), 0) : null)}</div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Attempts</div>
        </div>
      </div>
      {!top.length ? <EmptyState message="No quizzes yet" /> : (
        <div className="divide-y divide-[var(--qs-line)] border-t-2 border-[var(--qs-line)]">
          {top.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
              <span className="min-w-0 truncate"><b className="font-bold text-[var(--qs-ink)]">{q.name}</b> <span className="text-[var(--qs-muted)]">· {q.attempts} attempts</span></span>
              <span className="shrink-0 tabular-nums text-[11px] text-[var(--qs-muted)]">{timeAgo(q.last_activity)}</span>
            </div>
          ))}
        </div>
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
          className="pf-focus w-40 rounded-[12px] border-2 border-[var(--border)] bg-[var(--platform-input)] px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      }
    >
      <div className="mb-2 flex flex-wrap gap-1">
        {filters.map((s) => (
          <button
            key={s}
            onClick={() => { setScope(s); setPage(1); }}
            data-selected={scope === s}
            className="b b-chip"
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
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="b sm">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} className="b sm">Next</button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
