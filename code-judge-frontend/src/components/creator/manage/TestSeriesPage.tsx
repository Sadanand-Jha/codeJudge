"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  BarChart3,
  Boxes,
  Copy,
  Layers,
  ListChecks,
  PenLine,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  BillButton,
  EmptyState,
  ErrorState,
  formatINR,
  formatINRCompact,
  MockDataTag,
  PageHeader,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
} from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";

type SeriesStatus = "Published" | "Draft" | "Scheduled";

interface SeriesItem {
  id: string;
  name: string;
  exam: string;
  description: string;
  testCount: number;
  price: number;
  originalPrice: number;
  subscribers: number;
  revenue: number;
  status: SeriesStatus;
}

const SERIES_STATUS_TONE: Record<SeriesStatus, "emerald" | "amber" | "violet"> = {
  Published: "emerald",
  Draft: "amber",
  Scheduled: "violet",
};

const TEST_SERIES: SeriesItem[] = [
  {
    id: "s1",
    name: "JEE Advanced 2026 Crash Course",
    exam: "JEE Advanced",
    description: "Full-syllabus test pack with previous-year level difficulty for the final 90 days.",
    testCount: 18,
    price: 1499,
    originalPrice: 2999,
    subscribers: 1240,
    revenue: 1428000,
    status: "Published",
  },
  {
    id: "s2",
    name: "NEET UG Biology Master Series",
    exam: "NEET UG",
    description: "Chapter-wise tests mapped to the latest NCERT and NEET blueprint.",
    testCount: 12,
    price: 899,
    originalPrice: 1499,
    subscribers: 862,
    revenue: 512000,
    status: "Published",
  },
  {
    id: "s3",
    name: "CAT Quant & DILR Sprint",
    exam: "CAT",
    description: "Timed sectional mocks with detailed video solutions for QA and DILR.",
    testCount: 15,
    price: 1199,
    originalPrice: 1999,
    subscribers: 641,
    revenue: 386000,
    status: "Published",
  },
  {
    id: "s4",
    name: "Class 12 Boards — Physics & Chemistry",
    exam: "CBSE Boards",
    description: "Board-pattern full-length papers for both Physics and Chemistry.",
    testCount: 8,
    price: 599,
    originalPrice: 999,
    subscribers: 1932,
    revenue: 614000,
    status: "Scheduled",
  },
  {
    id: "s5",
    name: "SSC CGL Tier 1 Target Batch",
    exam: "SSC CGL",
    description: "Quant, Reasoning, English and GK practice tests with adaptive analysis.",
    testCount: 22,
    price: 799,
    originalPrice: 1299,
    subscribers: 410,
    revenue: 0,
    status: "Draft",
  },
  {
    id: "s6",
    name: "UPSC CSAT Foundation",
    exam: "UPSC CSE",
    description: "Structured practice series for the CSAT paper — from basics to advanced.",
    testCount: 10,
    price: 999,
    originalPrice: 1500,
    subscribers: 268,
    revenue: 118000,
    status: "Draft",
  },
  {
    id: "s7",
    name: "Bank PO Prelims Booster",
    exam: "IBPS PO",
    description: "High-frequency topic tests covering the full prelims syllabus.",
    testCount: 14,
    price: 699,
    originalPrice: 1099,
    subscribers: 534,
    revenue: 210000,
    status: "Published",
  },
];

const CARD_ACTIONS: Array<{ id: string; label: string; icon: typeof PenLine }> = [
  { id: "edit", label: "Edit", icon: PenLine },
  { id: "tests", label: "Manage Tests", icon: ListChecks },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "duplicate", label: "Duplicate", icon: Copy },
  { id: "archive", label: "Archive", icon: Archive },
];

export function TestSeriesPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { state, data, retry } = useBillingData(
    () => ({ series: TEST_SERIES }),
    { delayMs: 650, demoState }
  );

  const series = data?.series ?? TEST_SERIES;

  const totals = useMemo(
    () => ({
      count: series.length,
      tests: series.reduce((s, x) => s + x.testCount, 0),
      subscribers: series.reduce((s, x) => s + x.subscribers, 0),
      revenue: series.reduce((s, x) => s + x.revenue, 0),
    }),
    [series]
  );

  const seriesAction = (item: SeriesItem, label: string) =>
    toast.info({
      title: `${label} — ${item.name}`,
      description: "This will be wired to the backend once available.",
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Series"
        subtitle="Bundle tests into series and sell them together."
        badge={<MockDataTag />}
        actions={
          <BillButton href="/creator/series/create" icon={<Plus className="h-4 w-4" />}>
            New Series
          </BillButton>
        }
      />

      {state === "loading" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl border border-border bg-card" />
            ))}
          </div>
        </>
      )}
      {state === "error" && (
        <ErrorState onRetry={retry} message="We couldn't load your test series. Please try again in a moment." />
      )}
      {state === "empty" && (
        <EmptyState
          title="No test series yet"
          description="Bundle your tests into a series with flexible pricing and sell them together to students."
          action={<BillButton href="/creator/series/create">Create your first series</BillButton>}
        />
      )}

      {state === "ready" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Series"
              value={totals.count}
              display={String(totals.count)}
              hint="across exams"
              accent="primary"
              icon={<Layers className="h-4 w-4" />}
            />
            <StatCard
              label="Tests Bundled"
              value={totals.tests}
              display={String(totals.tests)}
              hint="inside all series"
              accent="info"
              icon={<Boxes className="h-4 w-4" />}
            />
            <StatCard
              label="Subscribers"
              value={totals.subscribers}
              display={totals.subscribers.toLocaleString("en-IN")}
              hint="all-time"
              accent="warning"
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Revenue"
              value={totals.revenue}
              display={formatINRCompact(totals.revenue)}
              hint="from series sales"
              accent="success"
              icon={<Wallet className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {series.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors duration-200 hover:border-border-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-text-primary">{s.name}</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      {s.exam}
                    </p>
                  </div>
                  <StatusBadge label={s.status} tone={SERIES_STATUS_TONE[s.status]} dot />
                </div>

                <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">{s.description}</p>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-text-primary tabular-nums">{formatINR(s.price)}</span>
                      {s.originalPrice > s.price && (
                        <span className="text-xs text-text-muted line-through tabular-nums">
                          {formatINR(s.originalPrice)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-text-muted">{s.testCount} tests bundled</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary tabular-nums">
                      {s.subscribers.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-text-muted">subscribers</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2">
                  <span className="text-[11px] font-medium text-text-muted">Revenue</span>
                  <span className="text-[13px] font-bold text-emerald-600 tabular-nums dark:text-emerald-300">
                    {formatINRCompact(s.revenue)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                  {CARD_ACTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => seriesAction(s, label)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}