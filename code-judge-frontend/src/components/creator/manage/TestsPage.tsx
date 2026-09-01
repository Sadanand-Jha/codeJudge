"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  MoreHorizontal,
  ClipboardList,
  Plus,
  Pencil,
  Copy,
  Eye,
  BarChart3,
  Share2,
  Rocket,
  Archive,
  Trash2,
  Users,
  Trophy,
} from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  SegmentedControl,
  BillButton,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  formatINR,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

type TestStatus = "published" | "draft" | "scheduled" | "archived";

interface MockTest {
  id: string;
  name: string;
  exam: string;
  questions: number;
  durationMin: number;
  attempts: number;
  avgScore: number;
  revenue: number;
  status: TestStatus;
  updated: string;
}

const MOCK_TESTS: MockTest[] = [
  { id: "t_01", name: "JEE Main 2026 Mock Test 1", exam: "JEE Main", questions: 90, durationMin: 180, attempts: 12840, avgScore: 62, revenue: 84500, status: "published", updated: "19 Aug 2026" },
  { id: "t_02", name: "NEET UG Full Syllabus Test 4", exam: "NEET", questions: 200, durationMin: 200, attempts: 15320, avgScore: 58, revenue: 96200, status: "published", updated: "18 Aug 2026" },
  { id: "t_03", name: "SSC CGL Tier 1 Practice Set 12", exam: "SSC CGL", questions: 100, durationMin: 60, attempts: 22110, avgScore: 71, revenue: 67400, status: "published", updated: "17 Aug 2026" },
  { id: "t_04", name: "CAT 2026 Mock Test 2", exam: "CAT", questions: 66, durationMin: 120, attempts: 8730, avgScore: 54, revenue: 124800, status: "published", updated: "15 Aug 2026" },
  { id: "t_05", name: "UPSC Prelims GS Paper 1", exam: "UPSC CSE", questions: 100, durationMin: 120, attempts: 4920, avgScore: 47, revenue: 58300, status: "draft", updated: "14 Aug 2026" },
  { id: "t_06", name: "GATE CS Subjectwise: Algorithms", exam: "GATE CSE", questions: 35, durationMin: 60, attempts: 3105, avgScore: 66, revenue: 22900, status: "draft", updated: "12 Aug 2026" },
  { id: "t_07", name: "IBPS PO Prelims Mock 5", exam: "IBPS PO", questions: 100, durationMin: 60, attempts: 0, avgScore: 0, revenue: 0, status: "scheduled", updated: "18 Aug 2026" },
  { id: "t_08", name: "JEE Advanced Paper 1", exam: "JEE Advanced", questions: 54, durationMin: 180, attempts: 0, avgScore: 0, revenue: 0, status: "scheduled", updated: "16 Aug 2026" },
  { id: "t_09", name: "Class 12 Board Physics 2025", exam: "CBSE Class 12", questions: 35, durationMin: 90, attempts: 18400, avgScore: 73, revenue: 12300, status: "archived", updated: "02 Jun 2026" },
];

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "archived", label: "Archived" },
];

type TabId = "all" | "published" | "draft" | "scheduled" | "archived";

const STATUS_META: Record<TestStatus, { label: string; tone: StatusTone }> = {
  published: { label: "Published", tone: "emerald" },
  draft: { label: "Draft", tone: "amber" },
  scheduled: { label: "Scheduled", tone: "violet" },
  archived: { label: "Archived", tone: "slate" },
};

export function TestsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(() => MOCK_TESTS, { delayMs: 650, demoState });
  const [filter, setFilter] = useState<TabId>("all");

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (filter === "all") return list;
    return list.filter((t) => t.status === filter);
  }, [data, filter]);

  const stats = useMemo(() => {
    const attempts = filtered.reduce((sum, t) => sum + t.attempts, 0);
    const avg = filtered.length ? filtered.reduce((sum, t) => sum + t.avgScore, 0) / filtered.length : 0;
    const published = filtered.filter((t) => t.status === "published").length;
    return { attempts, avg, published };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Tests"
        subtitle="Create, manage and publish your tests"
        badge={<MockDataTag />}
        actions={
          <BillButton href="/creator/tests/create" icon={<Plus className="h-4 w-4" />}>
            New Test
          </BillButton>
        }
      />

      {state === "loading" && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={6} cols={8} />
        </>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No tests yet"
          description="Create your first test to start tracking attempts, scores and revenue."
          action={<BillButton href="/creator/tests/create">New Test</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl options={TABS} value={filter} onChange={setFilter} size="md" />
            <span className="text-[11px] font-semibold text-text-muted">
              Showing {filtered.length} of {data.length} tests
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Tests"
              value={filtered.length}
              display={String(filtered.length)}
              hint="across all statuses"
              accent="primary"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Published"
              value={stats.published}
              display={String(stats.published)}
              hint="live for students"
              accent="success"
              icon={<Rocket className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Total Attempts"
              value={stats.attempts}
              display={stats.attempts.toLocaleString("en-IN")}
              hint="cumulative submissions"
              accent="info"
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Avg Score"
              value={Math.round(stats.avg)}
              display={`${stats.avg.toFixed(1)}%`}
              hint="student average"
              accent="gold"
              icon={<Trophy className="h-3.5 w-3.5" />}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No tests in this view"
              description="Try a different status filter or create a new test."
              action={<BillButton href="/creator/tests/create">New Test</BillButton>}
            />
          ) : (
            <Panel noPadding>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">All tests</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {filtered.length} test{filtered.length === 1 ? "" : "s"} · {filtered.reduce((s, t) => s + t.questions, 0)} questions total
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto p-5">
                <table className="w-full min-w-[920px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      <th className="px-3 py-3">Test Name</th>
                      <th className="px-3 py-3">Exam</th>
                      <th className="px-3 py-3 text-right">Questions</th>
                      <th className="px-3 py-3 text-right">Duration</th>
                      <th className="px-3 py-3 text-right">Attempts</th>
                      <th className="px-3 py-3 text-right">Avg Score</th>
                      <th className="px-3 py-3 text-right">Revenue</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Updated</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => {
                      const meta = STATUS_META[t.status];
                      return (
                        <motion.tr
                          key={t.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/10 to-violet-600/10 text-violet-500 dark:text-ai-accent">
                                <ClipboardList className="h-4 w-4" />
                              </div>
                              <p className="max-w-[220px] truncate font-semibold text-text-primary">{t.name}</p>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-text-secondary">{t.exam}</td>
                          <td className="px-3 py-4 text-right tabular-nums text-text-primary">{t.questions}</td>
                          <td className="px-3 py-4 text-right tabular-nums text-text-secondary">{t.durationMin} min</td>
                          <td className="px-3 py-4 text-right tabular-nums text-text-secondary">{t.attempts.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-4 text-right font-semibold tabular-nums text-text-primary">
                            {t.avgScore > 0 ? `${t.avgScore}%` : "—"}
                          </td>
                          <td className="px-3 py-4 text-right font-semibold tabular-nums text-text-primary">{formatINR(t.revenue)}</td>
                          <td className="px-3 py-4">
                            <StatusBadge label={meta.label} tone={meta.tone} dot />
                          </td>
                          <td className="px-3 py-4 text-xs text-text-muted">{t.updated}</td>
                          <td className="px-3 py-4 text-right">
                            <RowActions status={t.status} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function RowActions({ status }: { status: TestStatus }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggle = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 176;
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - menuWidth - 8);
    setPos({ top: rect.bottom + 6, left });
    setOpen((o) => !o);
  };

  const items: Array<{ label: string; icon: LucideIcon; danger?: boolean }> = [
    { label: "Edit", icon: Pencil },
    { label: "Duplicate", icon: Copy },
    { label: "Preview", icon: Eye },
    { label: "Analytics", icon: BarChart3 },
    { label: "Share", icon: Share2 },
    status === "published" ? { label: "Unpublish", icon: Rocket } : { label: "Publish", icon: Rocket },
    status === "archived" ? { label: "Unarchive", icon: Archive } : { label: "Archive", icon: Archive },
    { label: "Delete", icon: Trash2, danger: true },
  ];

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={open ? "Close test actions" : "Open test actions"}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
          open
            ? "border-pink-500/30 bg-pink-500/[0.08] text-pink-500 dark:border-ai-accent/40 dark:text-ai-accent"
            : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-44 rounded-2xl border border-border bg-card p-1.5 shadow-2xl"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                    item.danger
                      ? "text-danger hover:bg-danger/10"
                      : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}