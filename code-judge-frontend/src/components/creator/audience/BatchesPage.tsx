"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CalendarRange, PlayCircle, CalendarClock, CheckCircle2, UserCheck, MoreHorizontal, Pencil, Users, CalendarDays, Archive } from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  StatCard,
  StatCardSkeleton,
  BillButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

type BatchStatus = "running" | "upcoming" | "completed";

interface Batch {
  id: string;
  name: string;
  className: string;
  startDate: string;
  endDate: string;
  students: number;
  progress: number;
  status: BatchStatus;
}

const STATUS_TONE: Record<BatchStatus, StatusTone> = {
  running: "emerald",
  upcoming: "sky",
  completed: "slate",
};

const BATCHES: Batch[] = [
  { id: "b1", name: "NEET Crash Batch 1", className: "NEET 2027 Batch A", startDate: "01 Jul 2026", endDate: "31 Aug 2026", students: 84, progress: 68, status: "running" },
  { id: "b2", name: "JEE Morning Intensive", className: "JEE Main Crash Course", startDate: "05 Jun 2026", endDate: "30 Sep 2026", students: 142, progress: 52, status: "running" },
  { id: "b3", name: "Boards Weekend Prep", className: "CBSE Class 12 Boards", startDate: "20 Aug 2026", endDate: "20 Nov 2026", students: 61, progress: 8, status: "upcoming" },
  { id: "b4", name: "CSAT Foundation Batch", className: "UPSC Prelims CSAT", startDate: "01 Sep 2026", endDate: "31 Dec 2026", students: 47, progress: 0, status: "upcoming" },
  { id: "b5", name: "CAT Quant Sprint", className: "CAT 2026 Sectionals", startDate: "10 Feb 2026", endDate: "10 Aug 2026", students: 96, progress: 88, status: "running" },
  { id: "b6", name: "SSC Tier-1 Full Course", className: "SSC CGL Tier 1 (2025)", startDate: "01 Jan 2025", endDate: "30 Jun 2025", students: 54, progress: 100, status: "completed" },
  { id: "b7", name: "NEET Previous Batch 2", className: "NEET 2027 Batch A", startDate: "01 Dec 2025", endDate: "30 May 2026", students: 73, progress: 100, status: "completed" },
];

function BatchMenu() {
  const [open, setOpen] = useState(false);
  const items = [
    { id: "edit", label: "Edit", icon: Pencil },
    { id: "students", label: "Students", icon: Users },
    { id: "schedule", label: "Schedule", icon: CalendarDays },
    { id: "archive", label: "Archive", icon: Archive, destructive: true },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        aria-label="Batch actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl shadow-black/50"
            >
              {items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors",
                      i > 0 && "mt-0.5 border-t border-border/60 pt-2",
                      item.destructive
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-text-primary">{value}%</span>
    </div>
  );
}

export function BatchesPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => ({ batches: BATCHES, stats: { total: 7, active: 4, enrolled: 557, completion: 59 } }),
    { delayMs: 650, demoState }
  );

  const stats = useMemo(() => data?.stats, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        subtitle="Group students into batches with schedules and deadlines"
        badge={<MockDataTag />}
        actions={
          <BillButton variant="ghost" icon={<Plus className="h-4 w-4" />} href="/creator/batches/new">
            New Batch
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
          <TableSkeleton rows={7} cols={7} />
        </>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No batches yet"
          description="Create a batch to schedule tests and track deadlines for a group of students."
          action={<BillButton href="/creator/batches/new">New Batch</BillButton>}
        />
      )}

      {state === "ready" && data && stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Batches" value={stats.total} display={String(stats.total)} delta={3} accent="primary" icon={<CalendarRange className="h-4 w-4" />} />
            <StatCard label="Active Batches" value={stats.active} display={String(stats.active)} accent="success" icon={<PlayCircle className="h-4 w-4" />} />
            <StatCard label="Students Enrolled" value={stats.enrolled} display={String(stats.enrolled)} delta={11} accent="info" icon={<UserCheck className="h-4 w-4" />} />
            <StatCard label="Batch Completion" value={stats.completion} display={`${stats.completion}%`} delta={4} accent="gold" icon={<CheckCircle2 className="h-4 w-4" />} />
          </div>

          <div className="rounded-2xl border border-border bg-card transition-colors duration-200 hover:border-border-hover">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">All Batches</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Schedules, enrollment and completion progress</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <CalendarClock className="h-3.5 w-3.5" />
                Updated just now
              </div>
            </div>

            <div className="hidden overflow-x-auto p-4 md:block">
              <table className="w-full min-w-[900px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-3">Batch</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">Start Date</th>
                    <th className="px-3 py-3">End Date</th>
                    <th className="px-3 py-3 text-right">Students</th>
                    <th className="px-3 py-3">Progress</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.batches.map((b, i) => (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/[0.08] text-pink-600 dark:text-ai-accent">
                            <CalendarRange className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-semibold text-text-primary">{b.name}</p>
                            <p className="text-[11px] text-text-muted">{b.students} students</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <a href="/creator/classes" className="font-medium text-text-secondary transition-colors hover:text-pink-500 dark:hover:text-ai-accent">
                          {b.className}
                        </a>
                      </td>
                      <td className="px-3 py-4 tabular-nums text-text-secondary">{b.startDate}</td>
                      <td className="px-3 py-4 tabular-nums text-text-secondary">{b.endDate}</td>
                      <td className="px-3 py-4 text-right font-semibold tabular-nums text-text-primary">{b.students}</td>
                      <td className="px-3 py-4">
                        <ProgressBar value={b.progress} />
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge label={b.status} tone={STATUS_TONE[b.status]} dot />
                      </td>
                      <td className="px-3 py-4 text-right">
                        <BatchMenu />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2.5 p-4 md:hidden">
              {data.batches.map((b) => (
                <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{b.name}</p>
                      <a href="/creator/classes" className="text-[11px] text-text-secondary hover:text-pink-500 dark:hover:text-ai-accent">
                        {b.className}
                      </a>
                    </div>
                    <StatusBadge label={b.status} tone={STATUS_TONE[b.status]} dot />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-text-secondary">
                    <span>{b.startDate} → {b.endDate}</span>
                    <span className="font-semibold tabular-nums text-text-primary">{b.students} students</span>
                  </div>
                  <div className="mt-2.5 border-t border-border/60 pt-2.5">
                    <ProgressBar value={b.progress} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}