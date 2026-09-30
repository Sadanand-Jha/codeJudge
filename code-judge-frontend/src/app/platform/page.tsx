"use client";

import "./platform.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Users, Activity, Zap, CheckCircle2, RefreshCw, Search, Menu, ArrowUpRight, Clock3, ListChecks, TrendingUp, ChevronDown, Gauge, AlertTriangle, X, Network } from "lucide-react";
import { usePlatformGate, OwnerGate } from "@/components/platform/OwnerGate";
import { PlatformSidebar, PlatformSidebarDrawer } from "@/components/platform/PlatformSidebar";
import { platformApi } from "@/services/platform";
import type { OverviewData, LiveData, ActivityItem, PlatformRange, ObservabilityData, AiUsageData, PlatformErrorsData } from "@/services/platform";
import { ChartSkeleton, FeedSkeleton, HealthSkeleton, HeartbeatSkeleton, HeatmapSkeleton, KpiGridSkeleton, MiniStatsSkeleton, ProgressSkeleton, SectionCard, SectionSkeleton, TableSkeleton, EmptyState, ErrorState, StatusDot, fmtInt, fmtPct, fmtDuration, timeAgo } from "@/components/platform/ui";
import { SeriesChart } from "@/components/platform/charts";
import ThemeToggle from "@/components/ui/ThemeToggle";

type RangeKey = PlatformRange | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "custom", label: "Custom" },
];

function toPlatformError(e: unknown): { status?: number; message: string } {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return { status, message: status === 403 ? "Forbidden: owner access required." : "Unable to load this data." };
}

function useAsync<T>(fn: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading begins with the keyed request
    setLoading(true);
    fnRef
      .current()
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(toPlatformError(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key, nonce]);
  const retry = () => setNonce((n) => n + 1);
  return { data, error, loading, retry };
}

export default function PlatformPage() {
  const { gate, setGate } = usePlatformGate();

  if (gate === "checking") {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <SectionSkeleton rows={6} />
      </div>
    );
  }
  if (gate !== "open") {
    return (
      <div className="platform-shell min-h-screen bg-[var(--background)]">
        <OwnerGate mode={gate} onOpen={() => setGate("open")} />
      </div>
    );
  }
  return <PlatformDashboard />;
}

/* Dashboard (owner-only) */

function PlatformDashboard() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [customDays, setCustomDays] = useState(14);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [secsAgo, setSecsAgo] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const lastUpdatedRef = useRef<number | null>(null);

  const apiRange: PlatformRange = range === "custom" ? "custom" as PlatformRange : range;
  const days = range === "custom" ? customDays : undefined;
  const rangeKey = range === "custom" ? `custom:${customDays}` : range;

  const overview = useAsync<OverviewData>(() => platformApi.overview(apiRange, days), `overview:${rangeKey}`);
  const series = useAsync(() => platformApi.series(apiRange, days), `series:${rangeKey}`);
  const growth = useAsync(() => platformApi.growth(apiRange, days), `growth:${rangeKey}`);
  const usersQ = useAsync(() => platformApi.users(), "users");
  const quizzesQ = useAsync(() => platformApi.quizzes(), "quizzes");
  const observabilityQ = useAsync(() => platformApi.observability(apiRange, days), `observability:${rangeKey}`);
  const aiQ = useAsync(() => platformApi.ai(), "ai");
  const healthQ = useAsync(() => platformApi.health(), "health");
  const jobsQ = useAsync(() => platformApi.jobs(), "jobs");
  const errorsQ = useAsync(() => platformApi.errors(), "errors");
  const securityQ = useAsync(() => platformApi.security(), "security");
  const auditQ = useAsync(() => platformApi.audit(), "audit");
  const storageQ = useAsync(() => platformApi.storage(), "storage");
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
    overview.retry(); series.retry(); growth.retry(); usersQ.retry(); quizzesQ.retry();
    observabilityQ.retry(); aiQ.retry(); healthQ.retry(); jobsQ.retry(); errorsQ.retry(); securityQ.retry();
    auditQ.retry(); storageQ.retry(); alertsQ.retry(); loadLive();
  };

  const healthOk = useMemo(() => {
    const services = healthQ.data?.services;
    if (!services) return null;
    const vals = Object.values(services);
    if (vals.some((s) => s.status === "down")) return false;
    if (vals.some((s) => s.status === "degraded")) return false;
    return true;
  }, [healthQ.data]);

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
    <div className="platform-shell pf-canvas relative min-h-screen overflow-x-clip bg-[var(--background)] text-[var(--text-primary)]">
      <PlatformSidebar healthOk={healthOk} />
      <PlatformSidebarDrawer open={navOpen} onClose={() => setNavOpen(false)} healthOk={healthOk} />
      <div className="relative min-w-0 lg:pl-[248px]">
      <main id="top" className="mx-auto max-w-[1480px] scroll-mt-6 space-y-7 px-4 pb-8 pt-0 md:px-6 xl:px-8">
        {/* Top navigation */}
        <div className="sticky top-0 z-20 -mx-4 flex h-[60px] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)]/88 px-4 backdrop-blur-xl md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
          <nav className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]" aria-label="Breadcrumb">
            <button onClick={() => setNavOpen(true)} className="mr-1 rounded-[8px] border border-[var(--border)] p-1.5 text-[var(--text-primary)] lg:hidden" aria-label="Open navigation">
              <Menu size={15} />
            </button>
            <Link href="/quiz" className="hover:text-[var(--text-primary)]">CodeJudge</Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="font-medium text-[var(--text-primary)]">Platform</span>
            <span className="ml-1 hidden shrink-0 whitespace-nowrap rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.16em] text-[var(--text-muted)] sm:inline">OWNER CONSOLE</span>
          </nav>
          <div className="flex min-w-0 items-center justify-end gap-2 text-[12px] text-[var(--text-secondary)]">
            <GlobalSearch />
            <ThemeToggle className="h-8 w-14" />
            <span className="hidden items-center gap-1.5 xl:flex">
              <StatusDot status={healthOk === null ? "unknown" : healthOk ? "operational" : "down"} />
              {healthOk === null ? "Checking…" : healthOk ? "All systems operational" : "Attention needed"}
            </span>
            <span className="hidden tabular-nums 2xl:inline">Updated {secsAgo === null ? "…" : `${secsAgo}s ago`}</span>
            <button onClick={refreshAll} className="flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-[var(--text-primary)] hover:bg-[var(--card-hover)]">
              <RefreshCw size={13} /> <span className="hidden xl:inline">Refresh</span>
            </button>
            <span className="hidden shrink-0 whitespace-nowrap rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-1.5 py-px text-[9px] font-semibold tracking-widest text-[var(--danger)] xl:inline-flex">
              PRIVATE · OWNER
            </span>
          </div>
        </div>

        {/* Title and range */}
        <div className="flex flex-wrap items-end justify-between gap-5 pt-1">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Platform intelligence
              {live && <span className="flex items-center gap-1.5 normal-case tracking-normal text-[var(--success)]"><span className="pf-pulse h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Live</span>}
            </div>
            <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-[34px]">Platform Overview</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)] sm:text-[14px]">See how students are learning, taking assessments, and engaging with CodeJudge.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          <InsightMoments overview={o} quizzes={quizzesQ.data} series={series.data?.points ?? []} />
        </div>

        {/* Recent activity */}
        <ActivityFeed />

        {/* Quiz analytics */}
        <div id="quizzes" className="scroll-mt-6 space-y-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">Quiz analytics</h2>
            <p className="text-[13px] text-[var(--text-secondary)]">How assessments are being created and consumed.</p>
          </div>
          {quizzesQ.loading ? <div className="space-y-4"><MiniStatsSkeleton /><div className="grid gap-4 lg:grid-cols-2"><SectionCard title="Attempts over time" subtitle="Quiz attempts"><ChartSkeleton heightClass="h-[170px]" /></SectionCard><SectionCard title="Assessment Journey" subtitle="Student completion path"><SectionSkeleton rows={5} /></SectionCard></div></div> : quizzesQ.error ? <ErrorState message={quizzesQ.error.message} onRetry={quizzesQ.retry} /> : quizzesQ.data && (
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
                <SectionCard title="Attempts over time" subtitle={`Quiz attempts · last ${rangeKey}`}>
                  <AttemptsMiniChart series={series} />
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
            </>
          )}
        </div>

        {/* Top quizzes */}
        <SectionCard id="top-quizzes" title="Top quizzes" subtitle="Select a row to open quiz details">
          {quizzesQ.loading ? <TableSkeleton rows={5} columns={7} /> : quizzesQ.error ? <ErrorState message={quizzesQ.error.message} onRetry={quizzesQ.retry} /> :
            !quizzesQ.data?.top?.length ? <EmptyState message="No quizzes yet" /> : <TopQuizzesTable rows={quizzesQ.data.top} />}
        </SectionCard>

        {/* User analytics */}
        <div id="users" className="scroll-mt-6 space-y-3">
          <h2 className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">User analytics</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="User growth" subtitle={`New users per day · last ${rangeKey}`}>
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
              <Table
                head={["Teacher", "Quizzes", "Published", "Attempts"]}
                rows={usersQ.data.topTeachers.slice(0, 6).map((t) => [t.username ?? `#${t.id}`, String(t.created), String(t.live), String(t.attempts_generated)])}
                empty="No creators yet"
              />
            )}
          </SectionCard>
        </div>

        <SectionCard id="progress" title="Student Progress" subtitle="Descriptive learning signals from completed assessments">
          <StudentProgress overview={o} users={usersQ.data?.topUsers ?? []} loading={usersQ.loading || overview.loading} />
        </SectionCard>

        <ObservabilityPanel query={observabilityQ} />

        {/* AI usage and health */}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SectionCard id="ai" title="AI usage" subtitle="Generation, documents, assistance">
            {aiQ.loading ? <SectionSkeleton rows={2} /> : aiQ.error ? <ErrorState message={aiQ.error.message} onRetry={aiQ.retry} /> : (
              <AiUsagePanel data={aiQ.data} />
            )}
          </SectionCard>
          <SectionCard id="health" title="Platform health" subtitle="Service status and latency">
            {healthQ.loading ? <HealthSkeleton /> : healthQ.error ? <ErrorState message={healthQ.error.message} onRetry={healthQ.retry} /> : healthQ.data && (
              <HealthGrid services={healthQ.data.services} />
            )}
          </SectionCard>
        </div>

        {/* Errors and jobs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Issues" subtitle="Failures and warnings requiring investigation" id="errors">
            {errorsQ.loading ? <SectionSkeleton rows={3} /> : errorsQ.error ? <ErrorState message={errorsQ.error.message} onRetry={errorsQ.retry} /> : (
              <ErrorsPanel data={errorsQ.data} />
            )}
          </SectionCard>
          <SectionCard title="Background jobs" subtitle="Queues and workers" id="jobs">
            {jobsQ.loading ? <SectionSkeleton rows={3} /> : jobsQ.error ? <ErrorState message={jobsQ.error.message} onRetry={jobsQ.retry} /> : (
              <EmptyState message="Queue telemetry is not connected yet" detail={String((jobsQ.data as { reason?: string } | null)?.reason ?? "Worker throughput and failed jobs will appear after BullMQ metrics are wired.")} />
            )}
          </SectionCard>
        </div>

        {/* Security */}
        <div id="security" className="scroll-mt-24 space-y-3">
          <h2 className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">Security</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"><div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-primary)]"><ShieldIndicator /> Session protection</div><p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">Owner routes require a valid, non-revoked session and server-side role verification.</p></div>
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"><div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-primary)]"><ShieldIndicator /> Privacy-aware telemetry</div><p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">Sensitive fields are redacted. IP and user-agent data stay inside this owner-only console.</p></div>
          </div>
          <SectionCard title="Authentication activity" subtitle="Recent successful logins from the user ledger.">
            {securityQ.loading ? <TableSkeleton rows={5} columns={5} /> : securityQ.error ? <ErrorState message={securityQ.error.message} onRetry={securityQ.retry} /> : securityQ.data && (
              <Table
                head={["User", "Event", "Device", "Time", "Result"]}
                rows={securityQ.data.recentLogins.slice(0, 8).map((l) => [l.username ?? `#${l.id}`, "login", "—", timeAgo(l.at), "success"])}
                empty="No logins recorded"
              />
            )}
          </SectionCard>
        </div>

        {/* Audit log */}
        <SectionCard id="audit" title="Audit log" subtitle="Owner and privileged actions.">
          {auditQ.loading ? <SectionSkeleton rows={2} /> : auditQ.error ? <ErrorState message={auditQ.error.message} onRetry={auditQ.retry} /> : (
            <EmptyState message={String((auditQ.data as { reason?: string } | null)?.reason ?? "No audit records")} />
          )}
        </SectionCard>

        <p className="pb-4 text-center text-[11px] text-[var(--text-muted)]">
          Private owner console · Real platform data only · Unavailable telemetry is never estimated
        </p>
      </main>
      </div>
    </div>
  );
}

/* Building blocks */

function ObservabilityPanel({ query }: {
  query: { data: ObservabilityData | null; error: { message: string } | null; loading: boolean; retry: () => void };
}) {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const data = query.data;
  const summary = data?.summary;
  return (
    <section id="observability" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge size={17} className="text-[#EC4899]" />
            <h2 className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">API observability</h2>
          </div>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Requests, latency, failures, active sessions, and trace-level debugging from production traffic.</p>
        </div>
        {data?.activeWindowMinutes && <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] text-[var(--text-muted)]">Online = active in {data.activeWindowMinutes}m</span>}
      </div>
      {query.loading ? <SectionSkeleton rows={6} /> : query.error ? <ErrorState message={query.error.message} onRetry={query.retry} /> : !data?.available ? (
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
              <Table
                head={["Endpoint", "Method", "Requests", "Average", "P95"]}
                rows={(data.slowEndpoints ?? []).map((row) => [row.endpoint, row.method, fmtInt(row.requests), `${fmtInt(row.avg_ms)} ms`, `${fmtInt(row.p95_ms)} ms`])}
                empty="No request samples yet"
              />
            </SectionCard>
            <SectionCard title="Failing endpoints" subtitle="Routes with unsuccessful responses">
              <Table
                head={["Endpoint", "Method", "Requests", "Failures", "Rate"]}
                rows={(data.failingEndpoints ?? []).map((row) => [row.endpoint, row.method, fmtInt(row.requests), fmtInt(row.failures), fmtPct(row.error_rate)])}
                empty="No failures in this range"
              />
            </SectionCard>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <SectionCard title="Recent requests" subtitle="Select any request to inspect its trace and redacted metadata">
              {!data.recent?.length ? <EmptyState message="No requests recorded yet" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-[11px]">
                    <thead className="text-[10px] uppercase tracking-[.08em] text-[var(--text-muted)]"><tr>{["Status", "Method", "Endpoint", "User", "Duration", "Time", ""].map((h) => <th key={h} className="border-b border-[var(--border)] px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {data.recent.map((row) => <tr key={row.request_id} className="hover:bg-[var(--card-hover)]">
                        <td className={`px-2 py-2 font-semibold tabular-nums ${row.success ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{row.status_code}</td>
                        <td className="px-2 py-2 font-medium text-[var(--text-primary)]">{row.method}</td>
                        <td className="max-w-[260px] truncate px-2 py-2 text-[var(--text-secondary)]" title={row.endpoint}>{row.route_template || row.endpoint}</td>
                        <td className="max-w-[130px] truncate px-2 py-2 text-[var(--text-secondary)]">{row.username || "Anonymous"}</td>
                        <td className="px-2 py-2 tabular-nums text-[var(--text-secondary)]">{row.duration_ms} ms</td>
                        <td className="px-2 py-2 whitespace-nowrap text-[var(--text-muted)]">{timeAgo(row.started_at)}</td>
                        <td className="px-2 py-2"><button onClick={() => setSelectedRequest(row.request_id)} className="rounded-[7px] border border-[var(--border)] px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--card-hover)]">Inspect</button></td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
            <div className="space-y-4">
              <SectionCard title="Active users" subtitle="Current authenticated sessions">
                {!data.activeUsers?.length ? <EmptyState message="No active users" /> : <div className="space-y-2">
                  {data.activeUsers.slice(0, 8).map((user) => <div key={user.user_id} className="flex items-center justify-between gap-3 rounded-[9px] border border-[var(--border)] px-3 py-2">
                    <div className="min-w-0"><p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{user.username}</p><p className="truncate text-[10px] text-[var(--text-muted)]">{user.browser} · {user.os} · {user.device_type}</p></div>
                    <span className="shrink-0 text-[10px] text-[var(--success)]">{timeAgo(user.last_seen_at)}</span>
                  </div>)}
                </div>}
              </SectionCard>
              <SectionCard title="Top traffic users" subtitle="Requests in selected range">
                <Table head={["User", "Requests", "Failures"]} rows={(data.topUsers ?? []).slice(0, 8).map((user) => [user.username, fmtInt(user.requests), fmtInt(user.failures)])} empty="No user traffic yet" />
              </SectionCard>
            </div>
          </div>
        </>
      )}
      {selectedRequest && <RequestInspector requestId={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    </section>
  );
}

function RequestInspector({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const detail = useAsync(() => platformApi.requestDetail(requestId), requestId);
  const log = detail.data?.log;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Request inspector">
      <button className="absolute inset-0 bg-black/55" onClick={onClose} aria-label="Close request inspector" />
      <aside className="relative h-full w-full max-w-[680px] overflow-y-auto border-l border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#EC4899]">Request inspector</p><h3 className="mt-1 break-all text-[15px] font-semibold text-[var(--text-primary)]">{requestId}</h3></div>
          <button onClick={onClose} className="rounded-[8px] border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--card-hover)]" aria-label="Close"><X size={15} /></button>
        </div>
        {detail.loading ? <div className="mt-5"><SectionSkeleton rows={8} /></div> : detail.error ? <div className="mt-5"><ErrorState message={detail.error.message} onRetry={detail.retry} /></div> : log && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Status" value={String(log.status_code)} />
              <MiniStat label="Method" value={log.method} />
              <MiniStat label="Duration" value={`${log.duration_ms} ms`} />
              <MiniStat label="User" value={log.username || "Anonymous"} />
            </div>
            <InspectorBlock title="Request">
              <KeyValue label="Endpoint" value={log.endpoint} />
              <KeyValue label="Route" value={log.route_template || "—"} />
              <KeyValue label="Trace ID" value={log.trace_id} />
              <KeyValue label="IP" value={log.ip_address || "—"} />
              <KeyValue label="User agent" value={log.user_agent || "—"} />
              {log.error_message && <KeyValue label="Error" value={log.error_message} danger />}
              {typeof log.error_stack === "string" && log.error_stack && <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-[8px] bg-black/90 p-3 text-[10px] text-red-200">{log.error_stack}</pre>}
            </InspectorBlock>
            <InspectorBlock title="Redacted request metadata"><JsonView value={detail.data?.metadata} /></InspectorBlock>
            <InspectorBlock title="What happened immediately before">
              <Timeline rows={detail.data?.context ?? []} />
            </InspectorBlock>
            <InspectorBlock title="Trace events">
              <Timeline rows={detail.data?.trace ?? []} />
              {!!detail.data?.ai?.length && <><p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">AI calls</p><Timeline rows={detail.data.ai} /></>}
            </InspectorBlock>
          </div>
        )}
      </aside>
    </div>
  );
}

function InspectorBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4"><h4 className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]"><Network size={13} />{title}</h4>{children}</div>;
}

function KeyValue({ label, value, danger = false }: { label: string; value: unknown; danger?: boolean }) {
  return <div className="grid gap-1 border-b border-[var(--border)] py-2 last:border-0 sm:grid-cols-[110px_1fr]"><span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span><span className={`break-all text-[11px] ${danger ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}>{String(value)}</span></div>;
}

function JsonView({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-[8px] bg-[var(--platform-input)] p-3 text-[10px] leading-relaxed text-[var(--text-secondary)]">{JSON.stringify(value ?? {}, null, 2)}</pre>;
}

function Timeline({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="text-[11px] text-[var(--text-muted)]">No related events recorded.</p>;
  return <div className="space-y-2">{rows.map((row, index) => <div key={`${String(row.request_id ?? row.started_at)}-${index}`} className="flex gap-3 text-[11px]"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.success === false ? "bg-[var(--danger)]" : "bg-[var(--success)]"}`} /><div className="min-w-0"><p className="break-all text-[var(--text-primary)]">{String(row.method ?? row.operation ?? "event")} {String(row.endpoint ?? row.model ?? "")}</p><p className="text-[10px] text-[var(--text-muted)]">{row.status_code ? `${String(row.status_code)} · ` : ""}{String(row.duration_ms ?? 0)} ms · {timeAgo(String(row.started_at ?? ""))}</p></div></div>)}</div>;
}

function AiUsagePanel({ data }: { data: AiUsageData | null }) {
  if (!data?.available) return <EmptyState message="AI telemetry is not available" detail={data?.reason ?? "Apply the observability migration to begin collecting AI request usage."} />;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><MiniStat label="Today" value={fmtInt(data.requestsToday)} /><MiniStat label="30-day requests" value={fmtInt(data.requestsMonth)} /><MiniStat label="Tokens today" value={fmtInt(data.tokens)} /><MiniStat label="Avg latency" value={`${fmtInt(data.avgLatencyMs)} ms`} /><MiniStat label="Cost today" value={data.estimatedCost == null ? "—" : `$${data.estimatedCost.toFixed(4)}`} /></div>
    <Table head={["Provider / model", "Requests", "Tokens", "Failures"]} rows={(data.byModel ?? []).map((row) => [`${row.provider} / ${row.model}`, fmtInt(row.requests), fmtInt(row.tokens), fmtInt(row.failures)])} empty="No AI requests recorded yet" />
    {!!data.byEndpoint?.length && <Table head={["Endpoint", "Requests", "Tokens", "Failures"]} rows={data.byEndpoint.map((row) => [row.endpoint, fmtInt(row.requests), fmtInt(row.tokens), fmtInt(row.failures)])} empty="No endpoint usage yet" />}
    {!!data.byUser?.length && <Table head={["User", "Requests", "Tokens"]} rows={data.byUser.map((row) => [row.username, fmtInt(row.requests), fmtInt(row.tokens)])} empty="No user usage yet" />}
    <p className="text-[10px] text-[var(--text-muted)]">Cost requires AI_INPUT_COST_PER_1M_TOKENS and AI_OUTPUT_COST_PER_1M_TOKENS; it is never guessed.</p>
  </div>;
}

function ErrorsPanel({ data }: { data: PlatformErrorsData | null }) {
  if (!data?.available) return <EmptyState message="Error telemetry is not available" detail={data?.reason ?? "Apply the observability migration to begin grouping server errors."} />;
  if (!data.items.length) return <EmptyState message="No server errors recorded" detail="New 5xx failures will be grouped here by fingerprint." />;
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3"><MiniStat label="Errors today" value={fmtInt(data.errorsToday)} /><MiniStat label="Unresolved groups" value={fmtInt(data.unresolved)} /></div>
    <div className="space-y-2">{data.items.slice(0, 8).map((item) => <div key={item.error_id} className="rounded-[9px] border border-[var(--border)] px-3 py-2.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{item.error_type}: {item.message}</p><p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">{item.method} {item.endpoint || "unknown endpoint"} · last seen {timeAgo(item.last_seen_at)}</p></div><span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--danger)]/10 px-2 py-1 text-[10px] font-semibold text-[var(--danger)]"><AlertTriangle size={10} />{fmtInt(item.occurrence_count)}</span></div></div>)}</div>
  </div>;
}

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

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5">
      <div className="truncate text-[11px] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-0.5 truncate text-[18px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
      {sub && <div className="text-[11px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
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

function HealthGrid({ services }: { services: Record<string, { status: string; latencyMs?: number | null; note?: string }> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {Object.entries(services).map(([name, service]) => {
        const open = expanded === name;
        return (
          <button
            type="button"
            key={name}
            aria-expanded={open}
            onClick={() => setExpanded(open ? null : name)}
            className="pf-focus rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-left transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium capitalize text-[var(--text-primary)]">{name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <span className={service.status === "operational" ? "pf-pulse" : ""}><StatusDot status={service.status} /></span>
                  {service.status === "operational" ? "Operational" : service.status === "unknown" ? "Unknown" : service.status}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] tabular-nums text-[var(--text-muted)]">
                {service.latencyMs != null ? `${service.latencyMs}ms` : "No probe"}
                <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
            {open && <div className="mt-3 border-t border-[var(--border)] pt-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{service.note || (service.latencyMs != null ? `Latest health probe completed in ${service.latencyMs}ms.` : "This service does not currently expose a latency probe.")}</div>}
          </button>
        );
      })}
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

function InsightMoments({ overview, quizzes, series }: {
  overview: OverviewData | null;
  quizzes: { questionTypes: { type: string; n: number }[] | null } | null;
  series: Array<{ label: string; attempts: number }>;
}) {
  const peak = series.reduce<{ label: string; attempts: number } | null>((best, p) => !best || p.attempts > best.attempts ? p : best, null);
  const topType = (quizzes?.questionTypes ?? []).reduce<{ type: string; n: number } | null>((best, q) => !best || q.n > best.n ? q : best, null);
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      <Moment icon={<TrendingUp size={14} />} label="Peak activity day" value={peak?.label ?? "—"} detail={peak ? `${fmtInt(peak.attempts)} assessment attempts` : "Waiting for activity"} />
      <Moment icon={<Clock3 size={14} />} label="Average assessment time" value={fmtDuration(overview?.engagement?.avgDurationS)} detail="Across completed attempts" />
      <Moment icon={<ListChecks size={14} />} label="Most used question type" value={topType?.type ?? "—"} detail={topType ? `${fmtInt(topType.n)} questions` : "Question mix unavailable"} />
    </div>
  );
}

function Moment({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="pf-card rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"><div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]"><span className="text-[#EC4899]">{icon}</span>{label}</div><div className="mt-2 text-[18px] font-semibold text-[var(--text-primary)]">{value}</div><div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{detail}</div></div>;
}

function AssessmentJourney({ stages }: { stages: { label: string; value: number | null }[] }) {
  const first = stages[0]?.value ?? 0;
  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct = stage.value === null || first === 0 ? null : Math.max(0, Math.min(100, (stage.value / first) * 100));
        return (
          <div key={stage.label} title={`${stage.label}: ${stage.value ?? "unavailable"}${pct == null ? "" : ` · ${pct.toFixed(1)}% of opened`}`}>
            <div className="mb-1.5 flex items-end justify-between gap-3"><span className="text-[12px] text-[var(--text-secondary)]"><b className="mr-2 font-medium text-[var(--text-muted)]">{String(i + 1).padStart(2, "0")}</b>{stage.label}</span><span className="text-right text-[11px] tabular-nums text-[var(--text-muted)]">{fmtInt(stage.value)} {pct != null && `· ${pct.toFixed(0)}%`}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--platform-soft-strong)]"><div className="h-full origin-left rounded-full bg-[#EC4899]/80 transition-[width] duration-700" style={{ width: `${pct ?? 0}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveStudents({ rows }: { rows: { id: number; username: string; attempts: number; completed: number; last_active: string | null }[] }) {
  if (!rows.length) return <EmptyState message="Student participation will appear here" detail="This view fills as learners start and complete assessments." />;
  return <div className="divide-y divide-[var(--border)]">{rows.map((u) => {
    const completion = u.attempts ? Math.round((u.completed / u.attempts) * 100) : 0;
    return <div key={u.id} className="flex items-center gap-3 py-2.5"><InitialAvatar name={u.username} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium text-[var(--text-primary)]">{u.username || `Student #${u.id}`}</div><div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--platform-soft-strong)]"><div className="h-full rounded-full bg-[var(--success)]/70" style={{ width: `${completion}%` }} /></div></div><div className="w-20 text-right text-[10px] text-[var(--text-muted)]"><div>{u.completed}/{u.attempts} complete</div><div>{timeAgo(u.last_active)}</div></div></div>;
  })}</div>;
}

function StudentProgress({ overview, users, loading }: { overview: OverviewData | null; users: { attempts: number; completed: number }[]; loading: boolean }) {
  if (loading) return <ProgressSkeleton />;
  const participating = users.filter((u) => u.attempts > 0);
  const consistent = participating.filter((u) => u.attempts >= 3 && u.completed / u.attempts >= .7).length;
  const incomplete = participating.filter((u) => u.attempts >= 2 && u.completed / u.attempts < .5).length;
  return <div className="grid gap-3 sm:grid-cols-3">
    <ProgressSignal tone="success" title="Completion momentum" value={fmtPct(overview?.engagement?.completionRate)} detail="Platform-wide completed attempt rate" />
    <ProgressSignal tone="info" title="Consistent participation" value={fmtInt(consistent)} detail="Active students with 3+ attempts and 70%+ completion" />
    <ProgressSignal tone="warning" title="Worth reviewing" value={fmtInt(incomplete)} detail="Active students with multiple attempts and below 50% completion" />
  </div>;
}

function ProgressSignal({ tone, title, value, detail }: { tone: "success" | "info" | "warning"; title: string; value: string; detail: string }) {
  const color = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "#3B82F6";
  return <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4"><span className="mb-3 block h-1.5 w-6 rounded-full" style={{ background: color }} /><div className="text-[11px] text-[var(--text-secondary)]">{title}</div><div className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</div><p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{detail}</p></div>;
}

function statusLabel(s: string): string {
  const t = s.toLowerCase();
  if (t === "live") return "Published";
  if (t === "scheduled") return "Scheduled";
  if (t === "ended") return "Ended";
  if (t === "draft") return "Draft";
  return s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
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

function AttemptsMiniChart({ series }: {
  series: { data: { points: { label: string; attempts: number }[] | null } | null; loading: boolean; error: { message: string } | null; retry: () => void };
}) {
  if (series.loading) return <ChartSkeleton heightClass="h-[170px]" />;
  if (series.error) return <ErrorState message={series.error.message} onRetry={series.retry} />;
  const pts = series.data?.points ?? [];
  if (!pts.length) return <EmptyState message="No quiz activity yet" />;
  return <SeriesChart points={pts.map((p) => ({ label: p.label, attempts: p.attempts }))} keys={[{ key: "attempts", label: "Attempts" }]} height={170} />;
}

function Table({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <EmptyState message={empty} />;
  return (
    <div className="overflow-x-auto rounded-[8px] border border-[var(--border)]">
      <table className="w-full min-w-[520px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
            {head.map((h) => <th key={h} className="px-3 py-2 text-[11px] font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)]">
              {r.map((c, j) => (
                <td key={j} className={`max-w-[240px] truncate px-3 py-2 ${j === 0 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
                <div className="flex items-center gap-2"><Link href={`/quiz/${r.code}`} className="block min-w-0 truncate text-[var(--text-primary)] hover:underline">{r.name}</Link><StatusPill status={r.status} /></div>
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

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "live" ? "border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success)]" : normalized === "scheduled" ? "border-blue-500/25 bg-blue-500/10 text-blue-500" : "border-[var(--border)] bg-[var(--platform-soft)] text-[var(--text-muted)]";
  return <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider ${tone}`}>{statusLabel(status)}</span>;
}

function ShieldIndicator() {
  return <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--success)]/10"><CheckCircle2 size={11} className="text-[var(--success)]" /></span>;
}

function SortTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: 1 | -1; onClick: () => void }) {
  return (
    <th onClick={onClick} className="cursor-pointer px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
      {label}{active ? (dir === -1 ? " ↓" : " ↑") : ""}
    </th>
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

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ users: { id: number; username: string; email: string }[]; quizzes: { id: number; name: string; code: string }[]; attempts: { id: number; status: string; username: string | null }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      platformApi
        .search(q.trim())
        .then(setResults)
        .catch(() => { /* 403 or offline — keep the palette usable */ });
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const empty = results && !results.users.length && !results.quizzes.length && !results.attempts.length;

  return (
    <>
      <button onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }} className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]">
        <Search size={13} /><span className="hidden sm:inline">Search</span><kbd className="rounded border border-[var(--border)] px-1 text-[9px] text-[var(--text-muted)]">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Platform command palette">
          <div ref={boxRef} onMouseDown={(e) => e.stopPropagation()} className="pf-reveal w-full max-w-xl overflow-hidden rounded-[14px] border border-[var(--border-hover)] bg-[var(--popover)] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              <Search size={16} className="text-[var(--text-muted)]" />
              <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setResults(null); }} placeholder="Search students, assessments, rooms, attempts…" className="h-13 min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">ESC</kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {!results && <div className="px-3 py-8 text-center text-[12px] text-[var(--text-muted)]">Type at least two characters to search real platform data.</div>}
              {empty && <div className="px-3 py-8 text-center text-[12px] text-[var(--text-secondary)]">No matching students, assessments, or attempts.</div>}
              {results?.users.map((u) => <div key={`u${u.id}`} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[12px] hover:bg-[var(--card-hover)]"><InitialAvatar name={u.username} /><div><div className="text-[var(--text-primary)]">{u.username}</div><div className="text-[10px] text-[var(--text-muted)]">Student · {u.email}</div></div></div>)}
              {results?.quizzes.map((z) => <Link onClick={() => setOpen(false)} key={`q${z.id}`} href={`/quiz/${z.code}`} className="flex items-center justify-between rounded-[8px] px-3 py-2.5 text-[12px] hover:bg-[var(--card-hover)]"><span><span className="text-[var(--text-primary)]">{z.name}</span><span className="ml-2 text-[10px] text-[var(--text-muted)]">Assessment</span></span><ArrowUpRight size={13} className="text-[var(--text-muted)]" /></Link>)}
              {results?.attempts.map((a) => <div key={`a${a.id}`} className="flex items-center justify-between rounded-[8px] px-3 py-2.5 text-[12px] hover:bg-[var(--card-hover)]"><span className="text-[var(--text-primary)]">Attempt #{a.id}</span><span className="text-[10px] text-[var(--text-muted)]">{a.username ?? "Student"} · {a.status}</span></div>)}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[9px] text-[var(--text-muted)]"><span>Students · Assessments · Attempts</span><span>CodeJudge owner search</span></div>
          </div>
        </div>
      )}
    </>
  );
}
