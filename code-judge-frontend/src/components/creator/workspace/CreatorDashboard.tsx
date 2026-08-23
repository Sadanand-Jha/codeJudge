"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Users,
  ClipboardCheck,
  Wallet,
  TrendingUp,
  ArrowRight,
  Star,
  ShoppingBag,
  Banknote,
  RotateCcw,
  NotebookPen,
  GraduationCap,
  ListChecks,
  Layers,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  formatINRCompact,
  PageHeader,
  MockDataTag,
  Panel,
  StatCardSkeleton,
  EmptyState,
  ErrorState,
  BillButton,
  DeltaPill,
  StatusBadge,
  SegmentedControl,
} from "@/components/creator/billing/ui";
import { CREATOR_PROFILE, DASHBOARD_METRICS, CREATOR_ACTIVITY, WELCOME_CHECKLIST } from "./mockData";
import type { CreatorActivityEvent, CreatorDashboardMetric, WelcomeChecklistItem } from "./types";

const METRIC_ICONS = [
  ClipboardList,
  Users,
  ClipboardCheck,
  Wallet,
  TrendingUp,
] as const;

const ACCENT_DOT: Record<CreatorDashboardMetric["accent"], string> = {
  primary: "bg-violet-500",
  success: "bg-emerald-500",
  info: "bg-sky-500",
  gold: "bg-amber-400",
};

const ACTIVITY_META: Record<CreatorActivityEvent["kind"], { icon: typeof ShoppingBag; color: string }> = {
  test: { icon: NotebookPen, color: "text-violet-500" },
  student: { icon: GraduationCap, color: "text-sky-500" },
  purchase: { icon: ShoppingBag, color: "text-emerald-500" },
  payout: { icon: Banknote, color: "text-amber-500" },
  refund: { icon: RotateCcw, color: "text-rose-500" },
  feedback: { icon: Star, color: "text-yellow-500" },
  attempt: { icon: ClipboardCheck, color: "text-sky-500" },
};

const WEEKLY_SALES = [
  { day: "Mon", sales: 42 },
  { day: "Tue", sales: 56 },
  { day: "Wed", sales: 38 },
  { day: "Thu", sales: 61 },
  { day: "Fri", sales: 74 },
  { day: "Sat", sales: 88 },
  { day: "Sun", sales: 62 },
];

function MetricCard({ metric, index }: { metric: CreatorDashboardMetric; index: number }) {
  const Icon = METRIC_ICONS[index] ?? TrendingUp;
  const isMoney = metric.id === "earnings" || metric.id === "month";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-border-hover"
    >
      <span className={cn("absolute left-0 top-0 h-full w-[3px]", ACCENT_DOT[metric.accent])} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{metric.label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2.5 text-[26px] font-bold leading-none tracking-tight text-text-primary tabular-nums">
        {metric.display ?? (isMoney ? formatINRCompact(metric.value) : metric.value.toLocaleString("en-IN"))}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <DeltaPill pct={metric.deltaPct} />
        <span className="text-[11px] text-text-muted">{metric.hint}</span>
      </div>
    </motion.div>
  );
}

function WeeklySalesChart() {
  const max = Math.max(...WEEKLY_SALES.map((d) => d.sales));
  return (
    <div className="flex h-56 items-end justify-between gap-2">
      {WEEKLY_SALES.map((d) => (
        <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold text-text-secondary tabular-nums">{d.sales}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.sales / max) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full rounded-t-lg bg-[#EC4899] opacity-90"
          />
          <span className="text-[10px] font-medium text-text-muted">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({ items }: { items: CreatorActivityEvent[] }) {
  return (
    <div className="space-y-1">
      {items.map((event, i) => {
        const meta = ACTIVITY_META[event.kind];
        const Icon = meta.icon;
        return (
          <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 && (
              <span className="absolute left-4 top-9 bottom-0 w-px bg-border" aria-hidden="true" />
            )}
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]", meta.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-text-primary">{event.title}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{event.detail}</p>
              <p className="mt-1 text-[10px] font-medium text-text-muted">{event.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RANGE_OPTIONS = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
] as const;

const QUICK_CREATE_ITEMS = [
  { label: "Create Quiz", desc: "Quick interactive test", href: "/creator/quizzes/create", icon: ListChecks, gradient: "from-emerald-500 to-teal-600" },
  { label: "Create Test", desc: "Full-length mock test", href: "/creator/tests/create", icon: ClipboardList, gradient: "from-pink-500 to-violet-600" },
  { label: "Create Test Series", desc: "Bundle & sell tests", href: "/creator/series/create", icon: Layers, gradient: "from-violet-500 to-purple-600" },
  { label: "Create Problem", desc: "Practice question", href: "/creator/problems/create", icon: NotebookPen, gradient: "from-amber-500 to-orange-600" },
] as const;

const YOUR_CONTENT = [
  { name: "JEE Main 2027 Mock Series", type: "Series", status: "Published", meta: "12 tests · 842 students", tone: "emerald" as const },
  { name: "JEE Physics Mock Test #5", type: "Test", status: "Draft", meta: "40 questions · 180 min", tone: "amber" as const },
  { name: "NEET Biology Quiz: Genetics", type: "Quiz", status: "Draft", meta: "15 questions · 20 min", tone: "amber" as const },
  { name: "CAT 2027 Full Mock", type: "Test", status: "Scheduled", meta: "3 sections · 120 min", tone: "violet" as const },
];

function QuickCreateGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUICK_CREATE_ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              href={item.href}
              className="group flex h-full flex-col gap-2 rounded-xl border border-border/60 bg-white/[0.02] p-3.5 transition-colors hover:border-pink-500/30 hover:bg-pink-500/[0.03] dark:hover:border-ai-accent/30"
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white", item.gradient)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-primary">{item.label}</p>
                <p className="text-[10px] text-text-muted">{item.desc}</p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function WelcomeChecklist({ items }: { items: WelcomeChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Getting started</p>
        <span className="text-[11px] font-semibold text-pink-500 dark:text-ai-accent">{done}/{items.length}</span>
      </div>
      <div className="mb-3 h-1 rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-[#EC4899]"
          animate={{ width: `${(done / items.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
          >
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-text-primary">{item.label}</p>
              <p className="text-[10px] text-text-secondary">{item.detail}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CreatorDashboard({
  demoState,
}: {
  demoState?: "empty" | "error";
}) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const effectiveRange = isMobile ? "7d" : range;
  const profile = CREATOR_PROFILE;

  const { state, data, retry } = useBillingData(
    () => ({
      metrics: DASHBOARD_METRICS,
      activity: CREATOR_ACTIVITY,
      profile,
    }),
    { delayMs: 650, demoState }
  );

  const ready = state === "ready" && data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile.displayName.split(" ")[0]}`}
        subtitle="Here's what's happening with your tests and students today."
        badge={<MockDataTag />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              size="sm"
              options={isMobile ? RANGE_OPTIONS.filter((o) => o.id === "7d") : RANGE_OPTIONS}
              value={effectiveRange}
              onChange={(r) => setRange(r)}
            />
            <BillButton variant="ghost" href="/creator/billing/earnings">
              View earnings
            </BillButton>
          </div>
        }
      />

      {state === "loading" && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      {state === "error" && <ErrorState onRetry={retry} />}
      {state === "empty" && (
        <EmptyState
          title="Welcome to Creator Studio"
          description="Create your first test to start teaching students and tracking your earnings here."
          action={<BillButton href="/creator/tests/create">Create your first test</BillButton>}
        />
      )}

      {ready && (
        <>
          {/* Metrics — 2 per line on mobile, This Month's Revenue full width */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
            {data.metrics.map((m, i) => (
              <div key={m.id} className={m.id === "month" ? "col-span-2 xl:col-span-5" : ""}>
                <MetricCard metric={m} index={i} />
              </div>
            ))}
          </div>

          {/* Hero: quick create + weekly sales */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel
              title="Quick Create"
              subtitle="Start a new piece of content"
              className="lg:col-span-1"
              action={
                <Link href="/creator/create" className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent">
                  All options →
                </Link>
              }
            >
              <QuickCreateGrid />
              <Link
                href="/creator/ai-studio"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/[0.04] px-3 py-2 text-[11px] font-semibold text-violet-500 transition-colors hover:bg-violet-500/[0.08]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate with AI Studio
              </Link>
            </Panel>

            <Panel
              title="Sales This Week"
              subtitle={`${WEEKLY_SALES.reduce((s, d) => s + d.sales, 0)} purchases across all products`}
              className="lg:col-span-2"
              action={
                <Link href="/creator/billing/earnings" className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent">
                  Detailed earnings →
                </Link>
              }
            >
              <WeeklySalesChart />
            </Panel>
          </div>

          {/* Your Content */}
          <Panel
            title="Your Content"
            subtitle="Recent and in-progress content"
            action={
              <Link href="/creator/tests" className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent">
                Manage content →
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {YOUR_CONTENT.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3 transition-colors hover:border-pink-500/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-text-primary">{c.name}</p>
                      <span className="rounded-md border border-border bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-muted">
                        {c.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-text-secondary">{c.meta}</p>
                  </div>
                  <StatusBadge label={c.status} tone={c.tone} />
                </div>
              ))}
            </div>
          </Panel>

          {/* Bottom row: activity + status */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Recent Activity" subtitle="Latest events in your studio" className="lg:col-span-2">
              <ActivityFeed items={data.activity.slice(0, 6)} />
            </Panel>

            <div className="space-y-6">
              <Panel title="Performance" subtitle="Your studio at a glance">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/60 bg-white/[0.02] px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Avg. Score</p>
                    <p className="mt-1 text-lg font-bold text-text-primary tabular-nums">58.4%</p>
                    <DeltaPill pct={6.2} />
                  </div>
                  <div className="rounded-xl border border-border/60 bg-white/[0.02] px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Completion</p>
                    <p className="mt-1 text-lg font-bold text-text-primary tabular-nums">71%</p>
                    <DeltaPill pct={3.8} />
                  </div>
                  <div className="rounded-xl border border-border/60 bg-white/[0.02] px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Conversion</p>
                    <p className="mt-1 text-lg font-bold text-text-primary tabular-nums">12.6%</p>
                    <DeltaPill pct={1.1} />
                  </div>
                  <div className="rounded-xl border border-border/60 bg-white/[0.02] px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Refund Rate</p>
                    <p className="mt-1 text-lg font-bold text-text-primary tabular-nums">1.9%</p>
                    <DeltaPill pct={-0.4} />
                  </div>
                </div>
                <Link
                  href="/creator/analytics"
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-[12px] font-semibold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/30 dark:hover:text-ai-accent"
                >
                  View Analytics
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Panel>

              <Panel title="Your Status" subtitle="Account & verification">
                <WelcomeChecklist items={WELCOME_CHECKLIST} />
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}