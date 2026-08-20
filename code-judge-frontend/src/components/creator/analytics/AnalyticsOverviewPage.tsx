"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  TrendingUp,
  Timer,
  CheckCircle2,
  Repeat2,
  UserCheck,
  Trophy,
  Users,
  Target,
  BarChart3,
} from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatCard,
  StatCardSkeleton,
  PanelSkeleton,
  SegmentedControl,
  BillButton,
  EmptyState,
  ErrorState,
  DeltaPill,
  formatINR,
  formatINRCompact,
} from "@/components/creator/billing/ui";
import { MiniBarChart } from "./charts";
import { RANGE_OPTIONS, type Range } from "./shared";

interface RevenuePoint {
  label: string;
  value: number;
}

const REV_30 = [
  8200, 9400, 10100, 9600, 11300, 12200, 11800, 13100, 14200, 12800, 13500, 14700, 15600, 14900,
  16200, 17100, 15800, 16600, 17800, 18900, 17200, 18400, 19600, 20400, 19100, 21300, 22500, 21800,
  23600, 24800,
];

const REVENUE_SERIES: Record<Range, RevenuePoint[]> = {
  "7d": [
    { label: "Mon", value: 8200 },
    { label: "Tue", value: 9450 },
    { label: "Wed", value: 11200 },
    { label: "Thu", value: 9800 },
    { label: "Fri", value: 12800 },
    { label: "Sat", value: 14300 },
    { label: "Sun", value: 12250 },
  ],
  "30d": REV_30.map((v, i) => ({ label: String(i + 1), value: v })),
  "90d": [
    { label: "W1", value: 48200 },
    { label: "W2", value: 53100 },
    { label: "W3", value: 57600 },
    { label: "W4", value: 61800 },
    { label: "W5", value: 66400 },
    { label: "W6", value: 70100 },
    { label: "W7", value: 74800 },
    { label: "W8", value: 79300 },
    { label: "W9", value: 84200 },
    { label: "W10", value: 89600 },
    { label: "W11", value: 93400 },
    { label: "W12", value: 98600 },
  ],
};

interface OverviewStats {
  revenue: number;
  attempts: number;
  active: number;
  avgScore: number;
  conversion: number;
  revenueDelta: number;
  attemptsDelta: number;
  activeDelta: number;
  scoreDelta: number;
  conversionDelta: number;
}

function buildStats(range: Range): OverviewStats {
  const revenue = REVENUE_SERIES[range].reduce((s, p) => s + p.value, 0);
  switch (range) {
    case "7d":
      return {
        revenue,
        attempts: 1248,
        active: 342,
        avgScore: 68.4,
        conversion: 12.6,
        revenueDelta: 8.4,
        attemptsDelta: 6.2,
        activeDelta: 3.1,
        scoreDelta: 1.8,
        conversionDelta: -0.9,
      };
    case "30d":
      return {
        revenue,
        attempts: 5120,
        active: 861,
        avgScore: 67.9,
        conversion: 13.1,
        revenueDelta: 14.7,
        attemptsDelta: 11.3,
        activeDelta: 7.4,
        scoreDelta: -0.4,
        conversionDelta: 2.2,
      };
    default:
      return {
        revenue,
        attempts: 14240,
        active: 1205,
        avgScore: 68.2,
        conversion: 12.9,
        revenueDelta: 31.2,
        attemptsDelta: 26.8,
        activeDelta: 18.5,
        scoreDelta: 0.6,
        conversionDelta: 1.4,
      };
  }
}

interface TopTest {
  id: string;
  name: string;
  attempts: number;
  avgScore: number;
  revenue: number;
}

const TOP_TESTS: TopTest[] = [
  { id: "t1", name: "JEE Main Mock Test #12", attempts: 1248, avgScore: 71.4, revenue: 148200 },
  { id: "t2", name: "NEET Physics Drill", attempts: 986, avgScore: 63.8, revenue: 116400 },
  { id: "t3", name: "Logical Reasoning Set 3", attempts: 742, avgScore: 68.2, revenue: 89200 },
  { id: "t4", name: "Advanced Calculus Test", attempts: 514, avgScore: 58.9, revenue: 62800 },
  { id: "t5", name: "Organic Chemistry Quiz", attempts: 498, avgScore: 74.1, revenue: 55400 },
];

const ENGAGEMENT = [
  {
    id: "time",
    label: "Avg. time per test",
    value: "22m 14s",
    delta: -4.2,
    hint: "faster than last month",
    icon: Timer,
  },
  {
    id: "completion",
    label: "Completion rate",
    value: "78.4%",
    delta: 5.1,
    hint: "across all tests",
    icon: CheckCircle2,
  },
  {
    id: "reattempt",
    label: "Reattempt rate",
    value: "34.2%",
    delta: 2.8,
    hint: "students retaking tests",
    icon: Repeat2,
  },
  {
    id: "retention",
    label: "Retention",
    value: "61.7%",
    delta: -1.3,
    hint: "students active this month",
    icon: UserCheck,
  },
] as const;

export function AnalyticsOverviewPage({ demoState }: { demoState?: "empty" | "error" }) {
  const [range, setRange] = useState<Range>("30d");
  const { state, data, retry } = useBillingData(
    () => ({ stats: buildStats(range), topTests: TOP_TESTS, engagement: ENGAGEMENT }),
    { delayMs: 650, demoState }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Deep-dive into earnings, attempts and student behavior"
        badge={<MockDataTag />}
        actions={
          <BillButton variant="ghost" icon={<Download className="h-4 w-4" />}>
            Export Report
          </BillButton>
        }
      />

      {state === "loading" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <PanelSkeleton title="Revenue over time" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PanelSkeleton title="Top Tests" />
            <PanelSkeleton title="Engagement" />
          </div>
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No analytics yet"
          description="Once students attempt your tests, earnings, engagement and performance insights will appear here."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Total Revenue"
              value={data.stats.revenue}
              display={formatINRCompact(data.stats.revenue)}
              delta={data.stats.revenueDelta}
              hint="this period"
              accent="primary"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Total Attempts"
              value={data.stats.attempts}
              display={data.stats.attempts.toLocaleString("en-IN")}
              delta={data.stats.attemptsDelta}
              hint="this period"
              accent="info"
              icon={<BarChart3 className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Active Students"
              value={data.stats.active}
              display={data.stats.active.toLocaleString("en-IN")}
              delta={data.stats.activeDelta}
              hint="this period"
              accent="success"
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Avg. Score"
              value={data.stats.avgScore}
              display={`${data.stats.avgScore}%`}
              delta={data.stats.scoreDelta}
              hint="this period"
              accent="gold"
              icon={<Trophy className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Conversion Rate"
              value={data.stats.conversion}
              display={`${data.stats.conversion}%`}
              delta={data.stats.conversionDelta}
              hint="visits to attempts"
              accent="warning"
              icon={<Target className="h-3.5 w-3.5" />}
            />
          </div>

          <Panel
            title="Revenue over time"
            subtitle={`${formatINR(REVENUE_SERIES[range].reduce((s, p) => s + p.value, 0))} earned across this period`}
            action={
              <div className="flex flex-col items-end gap-2">
                <SegmentedControl value={range} onChange={setRange} options={RANGE_OPTIONS} />
                <DeltaPill pct={data.stats.revenueDelta} tone="good" />
              </div>
            }
          >
            <MiniBarChart data={REVENUE_SERIES[range]} height={220} formatter={formatINRCompact} />
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Top Tests" subtitle="Best performing tests by revenue">
              <div className="space-y-4">
                {TOP_TESTS.map((t, i) => {
                  const maxRevenue = Math.max(...TOP_TESTS.map((x) => x.revenue));
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-border/60 bg-white/[0.02] p-3.5 transition-colors hover:border-pink-500/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-violet-600 text-[11px] font-bold text-white">
                            {i + 1}
                          </span>
                          <p className="truncate text-[13px] font-semibold text-text-primary">{t.name}</p>
                        </div>
                        <p className="shrink-0 text-xs font-bold text-text-primary tabular-nums">
                          {formatINRCompact(t.revenue)}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-text-secondary">
                        <span>{t.attempts.toLocaleString("en-IN")} attempts</span>
                        <span>{t.avgScore}% avg score</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(t.revenue / maxRevenue) * 100}%` }}
                          transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Engagement" subtitle="How students interact with your content">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ENGAGEMENT.map((e, i) => {
                  const Icon = e.icon;
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-border bg-card-hover p-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 dark:text-ai-accent">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium text-text-secondary">{e.label}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <p className="text-xl font-bold text-text-primary tabular-nums">{e.value}</p>
                        <DeltaPill pct={e.delta} />
                      </div>
                      <p className="mt-1 text-[10px] text-text-muted">{e.hint}</p>
                    </motion.div>
                  );
                })}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}