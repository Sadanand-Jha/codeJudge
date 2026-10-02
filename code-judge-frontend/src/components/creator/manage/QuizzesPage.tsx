"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  ClipboardList,
  Copy,
  Eye,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Radio,
  Search,
  Sparkles,
  Star,
  Timer,
  Trash2,
  Users,
  WandSparkles,
} from "lucide-react";
import { MaskedCopyCode } from "@/components/creator/common/MaskedCopyCode";
import { useData } from "@/lib/hooks/useData";
import {
  BillButton,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";
import { deleteQuiz, getMyCreatedQuizzes, type Quiz } from "@/services/quiz";
import { toast } from "@/lib/toast";
import { AiStreamText } from "@/components/ui";

type QuizStatus = "live" | "draft" | "scheduled" | "completed";
type TabId = "all" | QuizStatus;

interface QuizCard {
  id: string;
  title: string;
  subject: string;
  questions: number;
  durationMin: number;
  attempts: number;
  completionRate: number;
  rating: number;
  ratingCount: number;
  status: QuizStatus;
}

type QuizListRecord = Quiz & {
  subject?: string | null;
  total_questions?: number | null;
  attempts?: number | null;
  completion_rate?: number | null;
  rating?: number | null;
  rating_count?: number | null;
};

function mapQuizToCard(q: QuizListRecord): QuizCard {
  const raw = q.status?.toLowerCase() ?? "";
  let status: QuizStatus = "draft";
  if (raw === "published" || raw === "live") status = "live";
  else if (raw === "scheduled") status = "scheduled";
  else if (raw === "completed" || raw === "ended") status = "completed";

  return {
    id: String(q.id),
    title: q.name,
    subject: q.subject || "General",
    questions: Number(q.total_questions) || 0,
    durationMin: Number(q.duration) || 0,
    attempts: Number(q.attempts) || 0,
    completionRate: Number(q.completion_rate) || 0,
    rating: Number(q.rating) || 0,
    ratingCount: Number(q.rating_count) || 0,
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

const STATUS_META: Record<QuizStatus, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "emerald" },
  draft: { label: "Draft", tone: "slate" },
  scheduled: { label: "Scheduled", tone: "violet" },
  completed: { label: "Completed", tone: "sky" },
};

export function QuizzesPage({ demoState }: { demoState?: "empty" | "error" }) {
  const router = useRouter();
  const [filter, setFilter] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuizCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { status, data, retry, error } = useData(async () => {
    if (demoState === "empty") return [];
    if (demoState === "error") throw new Error("We could not load your quizzes.");
    const res = await getMyCreatedQuizzes({ page: 1, limit: 50 });
    return res.quizzes.map(mapQuizToCard);
  });

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      live: list.filter((q) => q.status === "live").length,
      draft: list.filter((q) => q.status === "draft").length,
      scheduled: list.filter((q) => q.status === "scheduled").length,
      completed: list.filter((q) => q.status === "completed").length,
    } satisfies Record<TabId, number>;
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((q) => {
      const matchesStatus = filter === "all" || q.status === filter;
      const matchesSearch = !term || q.title.toLowerCase().includes(term) || q.subject.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [data, filter, search]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const attempted = list.filter((q) => q.attempts > 0);
    const rated = list.filter((q) => q.rating > 0);
    return {
      live: list.filter((q) => q.status === "live").length,
      completion: attempted.length
        ? attempted.reduce((sum, q) => sum + q.completionRate, 0) / attempted.length
        : null,
      rating: rated.length ? rated.reduce((sum, q) => sum + q.rating, 0) / rated.length : null,
    };
  }, [data]);

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

  const goTo = (quizId: string, page: "edit" | "preview" | "analytics" | "responses") => {
    setOpenMenuId(null);
    router.push(`/creator/quizzes/${quizId}/${page}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your Quizzes"
        subtitle="Create, manage and track your quizzes."
        actions={
          <BillButton
            href="/creator/quizzes/create"
            icon={<Plus className="h-4 w-4" />}
            className="h-10 rounded-lg px-4"
          >
            New Quiz
          </BillButton>
        }
      />

      <section className="flex flex-col gap-3 rounded-xl border border-violet-200/70 bg-card px-4 py-3 shadow-[0_1px_2px_rgba(17,24,39,0.03)] dark:border-violet-400/15 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <WandSparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-text-primary"><AiStreamText text="Build your next quiz with AI" /></h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">
                <Sparkles className="h-3 w-3" />
                AI service
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-text-secondary">
              <AiStreamText text="Upload a problem list and generate a complete, review-ready quiz in minutes." />
            </p>
          </div>
        </div>
        <BillButton
          href="/creator/quizzes/ai-generate"
          variant="outline"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          className="h-9 shrink-0 self-start rounded-lg px-3 sm:self-auto"
        >
          Generate with AI
        </BillButton>
      </section>

      {status === "loading" && (
        <>
          <ToolbarSkeleton />
          <StatsSkeleton />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
          description="Create one from scratch, or let AI turn your problem list into a review-ready quiz."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <BillButton href="/creator/quizzes/create">New Quiz</BillButton>
              <BillButton href="/creator/quizzes/ai-generate" variant="outline" icon={<Sparkles className="h-4 w-4" />}>
                Generate with AI
              </BillButton>
            </div>
          }
        />
      )}

      {status === "ready" && data && (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-2.5 shadow-[0_1px_2px_rgba(17,24,39,0.03)] xl:flex-row xl:items-center">
            <label className="relative block shrink-0 xl:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quizzes..."
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-[#EC4899]/40 focus:ring-2 focus:ring-[#EC4899]/10"
              />
            </label>

            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
                      active
                        ? "border-[#EC4899]/20 bg-[#FDF2F8] text-[#BE185D] dark:bg-[#EC4899]/10 dark:text-[#F9A8D4]"
                        : "border-transparent text-text-secondary hover:bg-card-hover hover:text-text-primary"
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "min-w-4 rounded px-1 py-0.5 text-center text-[10px] tabular-nums",
                        active ? "bg-[#EC4899]/10 text-[#BE185D] dark:text-[#F9A8D4]" : "bg-background text-text-muted"
                      )}
                    >
                      {counts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="px-1 text-[11px] font-medium text-text-muted xl:ml-auto xl:shrink-0">
              {filtered.length} {filtered.length === 1 ? "quiz" : "quizzes"}
            </span>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(17,24,39,0.03)] lg:grid-cols-4">
            <SummaryMetric label="Total quizzes" value={String(data.length)} hint="All quizzes" icon={ClipboardList} />
            <SummaryMetric
              label="Live now"
              value={String(stats.live)}
              hint="Accepting attempts"
              icon={Radio}
              className="border-l border-border"
            />
            <SummaryMetric
              label="Completion"
              value={stats.completion === null ? "—" : `${stats.completion.toFixed(0)}%`}
              hint={stats.completion === null ? "No attempts yet" : "Across attempts"}
              icon={BarChart3}
              className="border-t border-border lg:border-l lg:border-t-0"
            />
            <SummaryMetric
              label="Avg rating"
              value={stats.rating === null ? "—" : stats.rating.toFixed(1)}
              hint={stats.rating === null ? "No ratings yet" : "Student rating / 5"}
              icon={Star}
              className="border-l border-t border-border lg:border-t-0"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={search.trim() ? "No matching quizzes" : "No quizzes in this view"}
              description={search.trim() ? "Try another search or change the status filter." : "Try a different status filter or create a new quiz."}
              action={<BillButton href="/creator/quizzes/create">New Quiz</BillButton>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((quiz, index) => (
                <QuizCardItem
                  key={quiz.id}
                  quiz={quiz}
                  index={index}
                  menuOpen={openMenuId === quiz.id}
                  onToggleMenu={() => setOpenMenuId((current) => (current === quiz.id ? null : quiz.id))}
                  onCloseMenu={() => setOpenMenuId(null)}
                  onGoTo={(page) => goTo(quiz.id, page)}
                  onDelete={() => {
                    setOpenMenuId(null);
                    setDeleteTarget(quiz);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Delete this quiz?</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">This action cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <dl className="divide-y divide-border rounded-lg border border-border">
                {[
                  { label: "Quiz", value: deleteTarget.title || "Untitled Quiz" },
                  {
                    label: "Code",
                    value: (
                      <MaskedCopyCode
                        quizId={deleteTarget.id}
                        className="inline-flex h-7 items-center gap-2 rounded-md border border-transparent px-0 py-0 text-left font-mono text-[11px] font-medium text-text-muted transition-colors hover:text-[#EC4899]"
                      />
                    ),
                  },
                  { label: "Subject", value: deleteTarget.subject },
                  { label: "Questions", value: String(deleteTarget.questions) },
                  { label: "Status", value: STATUS_META[deleteTarget.status].label },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <dt className="text-text-secondary">{row.label}</dt>
                    <dd className="max-w-[60%] truncate font-medium text-text-primary">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-card-hover disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-60"
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

function QuizCardItem({
  quiz,
  index,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onGoTo,
  onDelete,
}: {
  quiz: QuizCard;
  index: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onGoTo: (page: "edit" | "preview" | "analytics" | "responses") => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[quiz.status];
  const hasAttempts = quiz.attempts > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.25 }}
      className="relative flex min-h-[224px] flex-col rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(17,24,39,0.04)] transition-[border-color,box-shadow] hover:border-[#EC4899]/20 hover:shadow-[0_6px_18px_rgba(17,24,39,0.06)] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-text-primary" title={quiz.title}>
            {quiz.title}
          </h3>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">Quiz code</span>
            <MaskedCopyCode
              quizId={quiz.id}
              className="inline-flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left text-[11px] font-medium transition-colors hover:bg-[#FDF2F8] hover:text-[#EC4899] dark:hover:bg-[#EC4899]/10"
            />
          </div>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} dot />
        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={`More actions for ${quiz.title}`}
            aria-expanded={menuOpen}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-label="Close actions menu" className="fixed inset-0 z-20 cursor-default" onClick={onCloseMenu} />
              <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_12px_30px_rgba(17,24,39,0.14)]">
                <MenuAction
                  icon={Copy}
                  label="Duplicate"
                  onClick={() => {
                    onCloseMenu();
                    toast.success({ title: "Duplicate", description: "Use Edit → Clone from quiz settings." });
                  }}
                />
                <MenuAction icon={ClipboardList} label="Responses" onClick={() => onGoTo("responses")} />
                <div className="my-1 border-t border-border" />
                <MenuAction icon={Trash2} label="Delete" danger onClick={onDelete} />
              </div>
            </>
          )}
        </div>
      </div>

      {quiz.questions === 0 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-y border-border/70 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary">Quiz has no questions yet.</p>
            <p className="mt-0.5 text-[11px] text-text-muted">Finish setup before publishing.</p>
          </div>
          <button
            type="button"
            onClick={() => onGoTo("edit")}
            className="shrink-0 text-xs font-semibold text-[#DB2777] transition-colors hover:text-[#BE185D] dark:text-[#F9A8D4]"
          >
            Add questions
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border/70 py-3 text-[11px] font-medium text-text-secondary">
          <MetaItem icon={HelpCircle} text={`${quiz.questions} ${quiz.questions === 1 ? "question" : "questions"}`} />
          {quiz.durationMin > 0 && <MetaItem icon={Timer} text={`${quiz.durationMin} min`} />}
          <MetaItem
            icon={Users}
            text={hasAttempts ? `${quiz.attempts.toLocaleString("en-IN")} attempts` : "No attempts yet"}
          />
        </div>
      )}

      {hasAttempts && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-text-muted">Completion</span>
            <span className="font-semibold tabular-nums text-text-primary">{quiz.completionRate}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/70">
            <div
              className="h-full rounded-full bg-[#EC4899] transition-[width]"
              style={{ width: `${Math.min(Math.max(quiz.completionRate, 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className={cn("mt-3", !hasAttempts && quiz.questions > 0 && "mb-1")}>
        <Stars rating={quiz.rating} ratingCount={quiz.ratingCount} />
      </div>

      <div className="mt-auto flex items-center gap-1 border-t border-border pt-3">
        <CardAction icon={Pencil} label="Edit" onClick={() => onGoTo("edit")} />
        <CardAction icon={Eye} label="Preview" onClick={() => onGoTo("preview")} />
        <CardAction icon={BarChart3} label="Analytics" onClick={() => onGoTo("analytics")} />
      </div>
    </motion.article>
  );
}

function SummaryMetric({ label, value, hint, icon: Icon, className }: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ClipboardList;
  className?: string;
}) {
  return (
    <div className={cn("min-h-[96px] px-4 py-3.5 sm:px-5", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-text-primary">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-text-muted">{hint}</p>
    </div>
  );
}

function MetaItem({ icon: Icon, text }: { icon: typeof HelpCircle; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 text-text-muted" />
      {text}
    </span>
  );
}

function CardAction({ icon: Icon, label, onClick }: { icon: typeof Pencil; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function MenuAction({ icon: Icon, label, onClick, danger }: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Stars({ rating, ratingCount }: { rating: number; ratingCount: number }) {
  if (rating <= 0) return <span className="text-[11px] font-medium text-text-muted">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold tabular-nums text-text-primary">{rating.toFixed(1)}</span>
      <span className="text-text-muted">
        from {ratingCount.toLocaleString("en-IN")} {ratingCount === 1 ? "rating" : "ratings"}
      </span>
    </span>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-2.5">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-9 flex-1" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="min-h-[96px] border-border p-4 odd:border-r lg:border-r lg:last:border-r-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-12" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function QuizCardSkeleton() {
  return (
    <div className="min-h-[224px] rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(17,24,39,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-36" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="mt-5 h-11 w-full" />
      <Skeleton className="mt-4 h-3 w-full" />
      <div className="mt-5 flex gap-2 border-t border-border pt-3">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  );
}
