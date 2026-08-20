"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, HelpCircle, Layers, FileStack, Star, Eye, Share2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatCard,
  StatCardSkeleton,
  PanelSkeleton,
  SegmentedControl,
  StatusBadge,
  type StatusTone,
  BillButton,
  EmptyState,
  ErrorState,
  DeltaPill,
  formatINRCompact,
} from "@/components/creator/billing/ui";
import { OverflowMenu } from "./charts";
import { RANGE_OPTIONS, type Range } from "./shared";

type ContentType = "Test" | "Quiz" | "Series";

interface ContentItem {
  id: string;
  name: string;
  type: ContentType;
  views: number;
  attempts: number;
  revenue: number;
  rating: number;
  trend: number;
}

const CONTENT_ITEMS: ContentItem[] = [
  { id: "c1", name: "JEE Main Mock Test #12", type: "Test", views: 4210, attempts: 1248, revenue: 148200, rating: 4.8, trend: 12.4 },
  { id: "c2", name: "NEET Physics Drill", type: "Test", views: 3150, attempts: 986, revenue: 116400, rating: 4.6, trend: 8.1 },
  { id: "c3", name: "Logical Reasoning Set 3", type: "Test", views: 2400, attempts: 742, revenue: 89200, rating: 4.4, trend: 5.6 },
  { id: "c4", name: "Daily Vocabulary Quiz", type: "Quiz", views: 2890, attempts: 1680, revenue: 38400, rating: 4.2, trend: 18.9 },
  { id: "c5", name: "Organic Chemistry Flashcards", type: "Quiz", views: 1980, attempts: 1140, revenue: 21600, rating: 4.5, trend: -2.3 },
  { id: "c6", name: "Advanced Calculus Test", type: "Test", views: 1620, attempts: 514, revenue: 62800, rating: 4.1, trend: 3.8 },
  { id: "c7", name: "Complete JEE Crash Course", type: "Series", views: 3480, attempts: 860, revenue: 214000, rating: 4.7, trend: 21.5 },
  { id: "c8", name: "NEET 90-Day Planner", type: "Series", views: 2100, attempts: 540, revenue: 118000, rating: 4.3, trend: -4.7 },
];

const TYPE_TONE: Record<ContentType, StatusTone> = {
  Test: "violet",
  Quiz: "sky",
  Series: "emerald",
};

interface EngagementRow {
  type: ContentType;
  attempts: number;
  completionRate: number;
  revenue: number;
}

const ENGAGEMENT_BY_TYPE: Record<Range, EngagementRow[]> = {
  "7d": [
    { type: "Test", attempts: 2140, completionRate: 78, revenue: 148200 },
    { type: "Quiz", attempts: 1320, completionRate: 71, revenue: 38400 },
    { type: "Series", attempts: 480, completionRate: 64, revenue: 51200 },
  ],
  "30d": [
    { type: "Test", attempts: 5120, completionRate: 79, revenue: 416600 },
    { type: "Quiz", attempts: 3420, completionRate: 73, revenue: 96000 },
    { type: "Series", attempts: 1240, completionRate: 66, revenue: 332000 },
  ],
  "90d": [
    { type: "Test", attempts: 14240, completionRate: 80, revenue: 1102400 },
    { type: "Quiz", attempts: 9560, completionRate: 74, revenue: 268000 },
    { type: "Series", attempts: 3560, completionRate: 68, revenue: 918000 },
  ],
};

const TYPE_ICON: Record<ContentType, typeof ClipboardList> = {
  Test: ClipboardList,
  Quiz: HelpCircle,
  Series: Layers,
};

export function ContentAnalyticsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const [range, setRange] = useState<Range>("30d");
  const { state, data, retry } = useBillingData(
    () => ({
      items: CONTENT_ITEMS,
      engagement: ENGAGEMENT_BY_TYPE,
      stats: {
        tests: CONTENT_ITEMS.filter((c) => c.type === "Test").length,
        quizzes: CONTENT_ITEMS.filter((c) => c.type === "Quiz").length,
        series: CONTENT_ITEMS.filter((c) => c.type === "Series").length,
        total: CONTENT_ITEMS.length,
      },
    }),
    { delayMs: 650, demoState }
  );

  const engagement = data?.engagement[range] ?? [];
  const maxAttempts = Math.max(...engagement.map((e) => e.attempts), 1);
  const maxCompletion = Math.max(...engagement.map((e) => e.completionRate), 1);
  const maxRevenue = Math.max(...engagement.map((e) => e.revenue), 1);

  const notify = (action: string, item: ContentItem) =>
    toast.info({
      title: action,
      description: `${action} for ${item.name}.`,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Analytics"
        subtitle="Which content drives engagement and revenue"
        badge={<MockDataTag />}
      />

      {state === "loading" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <PanelSkeleton title="Content performance" />
          <PanelSkeleton title="Engagement by type" />
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No content yet"
          description="Once you publish tests, quizzes and test series, their engagement and revenue metrics will appear here."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tests"
              value={data.stats.tests}
              display={String(data.stats.tests)}
              delta={14.3}
              hint="published"
              accent="primary"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Quizzes"
              value={data.stats.quizzes}
              display={String(data.stats.quizzes)}
              delta={9.1}
              hint="published"
              accent="info"
              icon={<HelpCircle className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Test Series"
              value={data.stats.series}
              display={String(data.stats.series)}
              delta={5.7}
              hint="published"
              accent="success"
              icon={<Layers className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Total Content Items"
              value={data.stats.total}
              display={String(data.stats.total)}
              delta={11.8}
              hint="across all formats"
              accent="gold"
              icon={<FileStack className="h-3.5 w-3.5" />}
            />
          </div>

          <Panel title="Content performance" subtitle="Engagement and revenue across your catalog">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-3">Content</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Views</th>
                    <th className="px-3 py-3">Attempts</th>
                    <th className="px-3 py-3">Revenue</th>
                    <th className="px-3 py-3">Rating</th>
                    <th className="px-3 py-3">Trend</th>
                    <th className="w-12 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-3">
                        <p className="max-w-[260px] truncate font-semibold text-text-primary">{c.name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge label={c.type} tone={TYPE_TONE[c.type]} />
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1.5 text-text-secondary tabular-nums">
                          <Eye className="h-3.5 w-3.5 text-text-muted" />
                          {c.views.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-text-primary tabular-nums">
                        {c.attempts.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-3 font-bold text-text-primary tabular-nums">
                        {formatINRCompact(c.revenue)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1 text-xs text-text-secondary tabular-nums">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {c.rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <DeltaPill pct={c.trend} />
                      </td>
                      <td className="px-2 py-3 text-right">
                        <OverflowMenu
                          items={[
                            { label: "View Details", icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => notify("Viewing details", c) },
                            { label: "Share", icon: <Share2 className="h-3.5 w-3.5" />, onSelect: () => notify("Share", c) },
                            { label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" />, onSelect: () => notify("Analytics", c) },
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2.5 md:hidden">
              {data.items.map((c, i) => {
                const Icon = TYPE_ICON[c.type];
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border/60 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">{c.name}</p>
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            {c.views.toLocaleString("en-IN")} views · {c.attempts.toLocaleString("en-IN")} attempts
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={c.type} tone={TYPE_TONE[c.type]} />
                        <OverflowMenu
                          items={[
                            { label: "View Details", icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => notify("Viewing details", c) },
                            { label: "Share", icon: <Share2 className="h-3.5 w-3.5" />, onSelect: () => notify("Share", c) },
                            { label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" />, onSelect: () => notify("Analytics", c) },
                          ]}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-text-secondary tabular-nums">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {c.rating.toFixed(1)}
                        </span>
                        <DeltaPill pct={c.trend} />
                      </div>
                      <p className="text-sm font-bold text-text-primary tabular-nums">{formatINRCompact(c.revenue)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Panel>

          <Panel
            title="Engagement by type"
            subtitle="Comparing tests, quizzes and series across key metrics"
            action={<SegmentedControl value={range} onChange={setRange} options={RANGE_OPTIONS} />}
          >
            <div className="space-y-5">
              {engagement.map((row, i) => (
                <motion.div
                  key={row.type}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge label={row.type} tone={TYPE_TONE[row.type]} dot />
                    <div className="grid w-full grid-cols-3 gap-4 sm:w-auto sm:flex sm:items-center sm:gap-6">
                      <div className="min-w-[120px] flex-1">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span>Attempts</span>
                          <span className="tabular-nums text-text-secondary">{row.attempts.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.attempts / maxAttempts) * 100}%` }}
                            transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
                          />
                        </div>
                      </div>
                      <div className="min-w-[120px] flex-1">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span>Completion</span>
                          <span className="tabular-nums text-text-secondary">{row.completionRate}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.completionRate / maxCompletion) * 100}%` }}
                            transition={{ delay: 0.25 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                          />
                        </div>
                      </div>
                      <div className="min-w-[120px] flex-1">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span>Revenue</span>
                          <span className="tabular-nums text-text-secondary">{formatINRCompact(row.revenue)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                            transition={{ delay: 0.35 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}