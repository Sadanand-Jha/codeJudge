"use client";

import { motion } from "framer-motion";
import { Plus, BookOpen, Users, LayoutGrid, Activity, MoreHorizontal, Settings2, Link2, Copy, Archive, ArrowUpRight } from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  StatCard,
  StatCardSkeleton,
  BillButton,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

type ClassStatus = "active" | "archived";

interface CreatorClass {
  id: string;
  name: string;
  description: string;
  subject: string;
  exam: string;
  students: number;
  tests: number;
  completionRate: number;
  status: ClassStatus;
}

const STATUS_TONE: Record<ClassStatus, StatusTone> = {
  active: "emerald",
  archived: "slate",
};

const CLASSES: CreatorClass[] = [
  { id: "c1", name: "NEET 2027 Batch A", description: "Full syllabus physics, chemistry and biology for medical aspirants.", subject: "Biology + Chemistry", exam: "NEET 2027", students: 142, tests: 18, completionRate: 78, status: "active" },
  { id: "c2", name: "JEE Main Crash Course", description: "Intensive revision track for students aiming at a top JEE Main rank.", subject: "Maths + Physics", exam: "JEE Main 2026", students: 208, tests: 24, completionRate: 64, status: "active" },
  { id: "c3", name: "CBSE Class 12 Boards", description: "Board-focused chapter-wise tests with detailed solutions and analysis.", subject: "Physics", exam: "CBSE Boards 2026", students: 96, tests: 12, completionRate: 85, status: "active" },
  { id: "c4", name: "UPSC Prelims CSAT", description: "Aptitude and reasoning drill sets for civil services aspirants.", subject: "CSAT", exam: "UPSC Prelims 2026", students: 63, tests: 9, completionRate: 57, status: "active" },
  { id: "c5", name: "CAT 2026 Sectionals", description: "Weekly section-wise mocks for Quantitative Aptitude and VARC.", subject: "Quant + VARC", exam: "CAT 2026", students: 121, tests: 15, completionRate: 71, status: "active" },
  { id: "c6", name: "SSC CGL Tier 1 (2025)", description: "Archived course from the previous recruitment cycle.", subject: "General Studies", exam: "SSC CGL 2025", students: 54, tests: 11, completionRate: 49, status: "archived" },
];

const CLASS_ACTIONS = [
  { id: "manage", label: "Manage", icon: Settings2 },
  { id: "share", label: "Share Link", icon: Link2 },
  { id: "duplicate", label: "Duplicate", icon: Copy },
  { id: "archive", label: "Archive", icon: Archive },
];

export function ClassesPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => ({ classes: CLASSES, stats: { total: 6, students: 684, avgSize: 114, activeWeek: 5 } }),
    { delayMs: 650, demoState }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle="Organize your students into classes for easier management"
        badge={<MockDataTag />}
        actions={
          <>
            <BillButton variant="ghost" icon={<Plus className="h-4 w-4" />} href="/creator/classes/new">
              New Class
            </BillButton>
          </>
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
              <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
                <div className="h-4 w-32 rounded-lg bg-white/[0.06]" />
                <div className="mt-3 h-3 w-full rounded-lg bg-white/[0.06]" />
                <div className="mt-4 h-3 w-2/3 rounded-lg bg-white/[0.06]" />
                <div className="mt-6 h-24 w-full rounded-xl bg-white/[0.05]" />
              </div>
            ))}
          </div>
        </>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No classes yet"
          description="Create a class to group your students and assign tests in bulk."
          action={<BillButton href="/creator/classes/new">New Class</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Classes" value={data.stats.total} display={String(data.stats.total)} delta={2} accent="primary" icon={<LayoutGrid className="h-4 w-4" />} />
            <StatCard label="Total Students" value={data.stats.students} display={String(data.stats.students)} delta={9} accent="success" icon={<Users className="h-4 w-4" />} />
            <StatCard label="Avg. Class Size" value={data.stats.avgSize} display={String(data.stats.avgSize)} accent="info" icon={<BookOpen className="h-4 w-4" />} />
            <StatCard label="Active This Week" value={data.stats.activeWeek} display={String(data.stats.activeWeek)} delta={3} accent="gold" icon={<Activity className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.classes.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group flex flex-col rounded-2xl border border-border bg-card transition-all duration-200 hover:border-border-hover"
              >
                <div className="flex items-start justify-between gap-3 p-5 pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold text-text-primary">{c.name}</h3>
                      <StatusBadge label={c.status} tone={STATUS_TONE[c.status]} dot />
                    </div>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                      {c.subject} · {c.exam}
                    </p>
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-white">
                    <BookOpen className="h-4 w-4" />
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 px-5 text-[13px] text-text-secondary">{c.description}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 px-5 py-3.5 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Students</p>
                    <p className="text-sm font-bold tabular-nums text-text-primary">{c.students}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Tests</p>
                    <p className="text-sm font-bold tabular-nums text-text-primary">{c.tests}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Completion</p>
                    <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-300">{c.completionRate}%</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-5 py-3">
                  <div className="flex items-center gap-1">
                    {CLASS_ACTIONS.map((a, idx) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          title={a.label}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors",
                            idx === 3
                              ? "hover:bg-danger/10 hover:text-danger"
                              : "hover:bg-white/[0.05] hover:text-text-primary"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      title="More actions"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <a
                    href="/creator/classes"
                    className="inline-flex items-center gap-1 rounded-lg bg-pink-500/[0.08] px-3 py-1.5 text-xs font-semibold text-pink-600 transition-colors hover:bg-pink-500/15 dark:text-ai-accent"
                  >
                    View
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}