"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Plus,
  Pencil,
  Copy,
  Eye,
  BarChart3,
  Trash2,
  Star,
  Users,
  Timer,
  HelpCircle,
  Radio,
} from "lucide-react";
import { useData } from "@/lib/hooks/useData";
import {
  PageHeader,
  SegmentedControl,
  BillButton,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";
import { getMyCreatedQuizzes, deleteQuiz, type Quiz } from "@/services/quiz";
import { toast } from "@/lib/toast";

type QuizStatus = "live" | "draft" | "scheduled" | "completed";

interface QuizCard {
  id: string;
  title: string;
  code: string;
  subject: string;
  questions: number;
  durationMin: number;
  attempts: number;
  completionRate: number;
  rating: number;
  status: QuizStatus;
}

function mapQuizToCard(q: Quiz): QuizCard {
  const raw = (q as any).status;
  let status: QuizStatus = "draft";
  if (raw === "published" || raw === "live") status = "live";
  else if (raw === "scheduled") status = "scheduled";
  else if (raw === "completed") status = "completed";
  else if (raw === "draft") status = "draft";

  return {
    id: String(q.id),
    title: q.name,
    code: q.code,
    subject: (q as any).subject || "General",
    questions: (q as any).total_questions ?? 0,
    durationMin: (q as any).duration ?? 0,
    attempts: (q as any).attempts ?? 0,
    completionRate: (q as any).completion_rate ?? 0,
    rating: (q as any).rating ?? 0,
    status,
  };
}

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
];

type TabId = "all" | "live" | "draft" | "scheduled" | "completed";

const STATUS_META: Record<QuizStatus, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "emerald" },
  draft: { label: "Draft", tone: "amber" },
  scheduled: { label: "Scheduled", tone: "violet" },
  completed: { label: "Completed", tone: "slate" },
};

const CARD_ACTIONS = [
  { label: "Edit", icon: Pencil },
  { label: "Duplicate", icon: Copy },
  { label: "Preview", icon: Eye },
  { label: "Analytics", icon: BarChart3 },
] as const;

export function QuizzesPage({ demoState }: { demoState?: "empty" | "error" }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<QuizCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { status, data, retry, error } = useData(async () => {
    const res = await getMyCreatedQuizzes({ page: 1, limit: 50 });
    return res.quizzes.map(mapQuizToCard);
  });
  const [filter, setFilter] = useState<TabId>("all");

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (filter === "all") return list;
    return list.filter((q) => q.status === filter);
  }, [data, filter]);

  const stats = useMemo(() => {
    const live = filtered.filter((q) => q.status === "live").length;
    const engaged = filtered.filter((q) => q.attempts > 0);
    const completion = engaged.length ? engaged.reduce((s, q) => s + q.completionRate, 0) / engaged.length : 0;
    const rating = engaged.length ? engaged.reduce((s, q) => s + q.rating, 0) / engaged.length : 0;
    return { live, completion, rating };
  }, [filtered]);

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteQuiz(deleteTarget.id);
      toast.success({ title: "Quiz deleted", description: `"${deleteTarget.title}" has been deleted.` });
      setDeleteTarget(null);
      retry();
    } catch (err) {
      toast.error({
        title: "Could not delete quiz",
        description: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Quizzes"
        subtitle="Manage your quick assessments and quizzes"
        actions={
          <BillButton href="/creator/quizzes/create" icon={<Plus className="h-4 w-4" />}>
            New Quiz
          </BillButton>
        }
      />

      {status === "loading" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {status === "error" && <ErrorState onRetry={retry} message={error?.message} />}

      {status === "empty" && (
        <EmptyState
          title="No quizzes yet"
          description="Create a quick assessment to engage students and gather instant feedback."
          action={<BillButton href="/creator/quizzes/create">New Quiz</BillButton>}
        />
      )}

      {status === "ready" && data && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl options={TABS} value={filter} onChange={setFilter} size="md" />
            <span className="text-[11px] font-semibold text-text-muted">
              Showing {filtered.length} of {data.length} quizzes
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Quizzes"
              value={filtered.length}
              display={String(filtered.length)}
              hint="across all statuses"
              accent="primary"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Live Now"
              value={stats.live}
              display={String(stats.live)}
              hint="accepting attempts"
              accent="success"
              icon={<Radio className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Completion Rate"
              value={Math.round(stats.completion)}
              display={`${stats.completion.toFixed(0)}%`}
              hint="avg across attempts"
              accent="info"
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Avg Rating"
              value={Math.round(stats.rating)}
              display={stats.rating.toFixed(1)}
              hint="student rating / 5"
              accent="gold"
              icon={<Star className="h-3.5 w-3.5" />}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No quizzes in this view"
              description="Try a different status filter or create a new quiz."
              action={<BillButton href="/creator/quizzes/create">New Quiz</BillButton>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((q, i) => {
                const meta = STATUS_META[q.status];
                const engaged = q.attempts > 0;
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.3 }}
                    className="flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors duration-200 hover:border-border-hover sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-text-primary">{q.title}</h3>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(q.code);
                            toast.success({ title: "Code copied", description: q.code });
                          }}
                          className="mt-0.5 font-mono text-[11px] text-text-muted transition-colors hover:text-text-primary"
                        >
                          {q.code}
                        </button>
                      </div>
                      <StatusBadge label={meta.label} tone={meta.tone} dot />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <MiniStat label="Questions" value={String(q.questions)} icon={HelpCircle} />
                      <MiniStat label="Duration" value={`${q.durationMin} min`} icon={Timer} />
                      <MiniStat label="Attempts" value={q.attempts.toLocaleString("en-IN")} icon={Users} />
                      <MiniStat label="Completion" value={engaged ? `${q.completionRate}%` : "\u2014"} icon={BarChart3} />
                    </div>

                    {engaged && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-muted">Completion</span>
                          <span className="font-bold text-text-primary tabular-nums">{q.completionRate}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600"
                            style={{ width: `${q.completionRate}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <Stars rating={q.rating} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                      {CARD_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => {
                              if (action.label === "Edit") {
                                router.push(`/creator/quizzes/${q.id}/edit`);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-pink-500 dark:hover:text-ai-accent"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{action.label}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(q)}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Delete this quiz?</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <dl className="divide-y divide-border rounded-lg border border-border">
                {[
                  { label: "Quiz", value: deleteTarget.title || "Untitled Quiz" },
                  { label: "Code", value: deleteTarget.code },
                  { label: "Subject", value: deleteTarget.subject },
                  { label: "Questions", value: String(deleteTarget.questions) },
                  { label: "Status", value: STATUS_META[deleteTarget.status]?.label ?? deleteTarget.status },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <dt className="text-text-secondary">{r.label}</dt>
                    <dd className="max-w-[60%] truncate font-medium text-text-primary">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger/20 disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-danger border-t-transparent" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.02] px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] text-text-muted">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  if (rating <= 0) {
    return <span className="text-[11px] text-text-muted">No ratings yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
      <span className="ml-1.5 text-xs font-bold text-text-primary tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}

function QuizCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full" />
        ))}
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <div className="mt-3 flex justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}