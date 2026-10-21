"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  ClipboardList,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Timer,
  Trash2,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { MaskedCopyCode } from "@/components/creator/common/MaskedCopyCode";
import { AiGenerateButton } from "@/components/creator/common/AiGenerateButton";
import { useData } from "@/lib/hooks/useData";
import { Skeleton } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";
import { deleteQuiz, getMyCreatedQuizzes, type Quiz } from "@/services/quiz";
import { toast } from "@/lib/toast";

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

const STATUS_META: Record<QuizStatus, { label: string; tone: string; dot: string }> = {
  live: { label: "Live", tone: "text-[var(--qs-ok)]", dot: "var(--qs-ok)" },
  draft: { label: "Draft", tone: "text-[#a85d00]", dot: "#a85d00" },
  scheduled: { label: "Scheduled", tone: "text-[#2457d6]", dot: "#2457d6" },
  completed: { label: "Completed", tone: "text-[var(--qs-bad)]", dot: "var(--qs-bad)" },
};

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60";
const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-60";
const BTN_SM =
  "inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
const BTN_PRI_SM =
  "inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-2 text-[12px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)]";
const PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.05em]";

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
      total: list.length,
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

  const goTo = (quizId: string, page: "edit" | "analytics" | "responses") => {
    setOpenMenuId(null);
    router.push(`/creator/quizzes/${quizId}/${page}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="qs-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.025em] text-[var(--qs-ink)] sm:text-[34px] lg:text-[38px]">
            Your quizzes
          </h1>
          <p className="mt-1.5 text-[14px] text-[var(--qs-muted)] sm:text-[15px]">
            Create, manage and track everything you publish.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/creator/quizzes/create" className={BTN_PRI}>
            <Plus className="h-4 w-4" />
            New quiz
          </Link>
        </div>
      </div>

      {/* AI callout */}
      <section className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[4px_4px_0_var(--qs-sun)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            <WandSparkles className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
              AI service
            </p>
            <h2 className="qs-display mt-1 text-[20px] font-extrabold text-[var(--qs-ink)]">
              Build your next quiz with AI
            </h2>
            <p className="mt-1 text-[13px] text-[var(--qs-muted)]">
              Upload a problem list and generate a complete, review-ready quiz in minutes.
            </p>
          </div>
          <AiGenerateButton
            href="/creator/quizzes/ai-generate"
            size="md"
            label="Generate with AI"
            className="shrink-0"
          />
        </div>
      </section>

      {status === "loading" && (
        <>
          <TilesSkeleton />
          <ToolbarSkeleton />
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center justify-center rounded-[16px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-bad)]/5 px-6 py-14 text-center">
          <p className="text-[14px] font-bold text-[var(--qs-ink)]">We couldn&apos;t load your quizzes</p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--qs-muted)]">
            {error?.message ?? "Something went wrong on our side. Please try again."}
          </p>
          <button type="button" onClick={retry} className={cn(BTN_SM, "mt-4")}>
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-6 py-16 text-center">
          <p className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">No quizzes yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-[var(--qs-muted)]">
            Create one from scratch, or let AI turn your problem list into a review-ready quiz.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/creator/quizzes/create" className={BTN_PRI_SM}>
              <Plus className="h-3.5 w-3.5" />
              New quiz
            </Link>
            <AiGenerateButton
              href="/creator/quizzes/ai-generate"
              size="sm"
              label="Generate with AI"
            />
          </div>
        </div>
      )}

      {status === "ready" && data && (
        <>
          {/* Stat tiles — the Live tile is the page's one bold element */}
          <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
            <StatTile
              label="Total quizzes"
              value={String(stats.total)}
              hint="Across all statuses"
              dot="var(--qs-brand)"
              index={0}
            />
            <StatTile
              label="Live now"
              value={String(stats.live)}
              hint={stats.live > 0 ? "Accepting attempts" : "Nothing running"}
              dot="var(--qs-ok)"
              highlight={stats.live > 0}
              index={1}
            />
            <StatTile
              label="Completion"
              value={stats.completion === null ? "—" : `${stats.completion.toFixed(0)}%`}
              hint={stats.completion === null ? "No attempts yet" : "Across attempted quizzes"}
              dot="#2457d6"
              index={2}
            />
            <StatTile
              label="Avg rating"
              value={stats.rating === null ? "—" : stats.rating.toFixed(1)}
              unit={stats.rating === null ? undefined : "/ 5"}
              hint={stats.rating === null ? "No ratings yet" : "Student rating"}
              dot="var(--qs-sun)"
              index={3}
            />
          </div>

          {/* Search + filter chips */}
          <div className="flex flex-col gap-3 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 xl:flex-row xl:items-center">
            <label className="relative block min-w-0 flex-1 xl:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quizzes..."
                className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-3 text-[13px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
              />
            </label>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border-2 px-3.5 text-[13px] font-bold transition-colors",
                      active
                        ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] font-extrabold tabular-nums",
                        active ? "bg-[var(--qs-bg)]/15" : "bg-[var(--qs-line)]/50 text-[var(--qs-muted)]"
                      )}
                    >
                      {counts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="shrink-0 px-1 text-[13px] font-semibold text-[var(--qs-muted)] xl:ml-auto">
              Showing {filtered.length} of {data.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-6 py-14 text-center">
              <p className="text-[14px] font-bold text-[var(--qs-ink)]">
                {search.trim() ? "No matching quizzes" : "No quizzes in this view"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--qs-muted)]">
                {search.trim()
                  ? "Try another search or change the status filter."
                  : "Try a different status filter or create a new quiz."}
              </p>
              <Link href="/creator/quizzes/create" className={cn(BTN_PRI_SM, "mt-4")}>
                <Plus className="h-3.5 w-3.5" />
                New quiz
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 2xl:grid-cols-3">
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
          className="fixed inset-0 z-80 flex items-center justify-center bg-[#1a1240]/60 p-4 backdrop-blur-[2px]"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Delete ${deleteTarget.title}`}
            className="relative w-full max-w-md overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[8px_8px_0_var(--qs-sun)]"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => !deleting && setDeleteTarget(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pb-5 pt-6">
              <div className="flex items-center gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] text-white">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="qs-display text-[19px] font-extrabold text-[var(--qs-ink)]">Delete this quiz?</h3>
                  <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">This action cannot be undone.</p>
                </div>
              </div>

              <dl className="mt-5 divide-y-2 divide-[var(--qs-line)] rounded-[14px] border-2 border-[var(--qs-line)]">
                {[
                  { label: "Quiz", value: deleteTarget.title || "Untitled quiz" },
                  {
                    label: "Code",
                    value: (
                      <MaskedCopyCode
                        quizId={deleteTarget.id}
                        className="inline-flex h-7 items-center gap-2 rounded-md border border-transparent px-0 py-0 text-left font-mono text-[11px] font-medium text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-brand)]"
                      />
                    ),
                  },
                  { label: "Subject", value: deleteTarget.subject },
                  { label: "Questions", value: String(deleteTarget.questions) },
                  {
                    label: "Status",
                    value: <StatusPill status={deleteTarget.status} />,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                    <dt className="shrink-0 text-[var(--qs-muted)]">{row.label}</dt>
                    <dd className="max-w-[60%] truncate font-semibold text-[var(--qs-ink)]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-6 py-4">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className={BTN}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={cn(BTN, "border-[var(--qs-bad)] text-[var(--qs-bad)] hover:border-[var(--qs-bad)] hover:bg-[var(--qs-bad)]/10")}
              >
                {deleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--qs-bad)] border-t-transparent" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Stat tiles
   ============================================================ */

function StatTile({
  label,
  value,
  unit,
  hint,
  dot,
  highlight,
  index,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  dot: string;
  highlight?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={cn(
        "rounded-[18px] border-2 px-4 py-4",
        highlight ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.08em]",
          highlight ? "text-[#1A1240]" : "text-[var(--qs-muted)]"
        )}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: highlight ? "#1A1240" : dot }}
        />
        {label}
      </p>
      <p
        className={cn(
          "qs-display mt-2 text-[34px] font-extrabold leading-none tracking-tight",
          highlight ? "text-[#1A1240]" : "text-[var(--qs-ink)]"
        )}
      >
        {value}
        {unit && (
          <span className={cn("ml-1.5 text-[13px] font-semibold", highlight ? "text-[#1A1240]/70" : "text-[var(--qs-muted)]")}>
            {unit}
          </span>
        )}
      </p>
      <p
        className={cn("mt-1.5 truncate text-[12px]", highlight ? "text-[#1A1240]/70" : "text-[var(--qs-muted)]")}
        title={hint}
      >
        {hint}
      </p>
    </motion.div>
  );
}

/* ============================================================
   Quiz card
   ============================================================ */

function StatusPill({ status }: { status: QuizStatus }) {
  return (
    <span className={cn(PILL, STATUS_META[status].tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_META[status].label}
    </span>
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
  onGoTo: (page: "edit" | "analytics" | "responses") => void;
  onDelete: () => void;
}) {
  const hasAttempts = quiz.attempts > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.25 }}
      className="relative flex min-h-[218px] flex-col rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 transition-colors hover:border-[var(--qs-brand)]"
    >
      <div className="flex items-start justify-between gap-2">
        <StatusPill status={quiz.status} />
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={`More actions for ${quiz.title}`}
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-transparent text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-line)] hover:text-[var(--qs-ink)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-label="Close actions menu" className="fixed inset-0 z-20 cursor-default" onClick={onCloseMenu} />
              <div className="absolute right-0 top-9 z-30 w-44 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[4px_4px_0_var(--qs-sun)]">
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[12px] font-bold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-bad)]/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete quiz
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 className="qs-display mt-2.5 break-words text-[18px] font-extrabold leading-snug text-[var(--qs-ink)]" title={quiz.title}>
        {quiz.title}
      </h3>

      <div className="mt-2.5">
        <MaskedCopyCode
          quizId={quiz.id}
          className="inline-flex items-center gap-2 rounded-[10px] border-2 border-dashed border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-1 font-mono text-[12px] font-bold tracking-[0.08em] text-[#1A1240]"
        />
      </div>

      {quiz.questions === 0 ? (
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-[14px] border-2 border-dashed border-[var(--qs-brand)]/50 px-3.5 py-2.5">
          <p className="min-w-0 text-[12px] font-semibold leading-5 text-[var(--qs-muted)]">
            No questions yet — finish setup before publishing.
          </p>
          <button type="button" onClick={() => onGoTo("edit")} className={cn(BTN_SM, "shrink-0")}>
            Add questions
          </button>
        </div>
      ) : (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <MetaPill icon={HelpCircle} iconClass="text-[var(--qs-brand)]" text={`${quiz.questions} ${quiz.questions === 1 ? "question" : "questions"}`} />
          {quiz.durationMin > 0 && <MetaPill icon={Timer} iconClass="text-[var(--qs-muted)]" text={`${quiz.durationMin} min`} />}
          <MetaPill
            icon={Users}
            iconClass="text-[var(--qs-ok)]"
            text={hasAttempts ? `${quiz.attempts.toLocaleString("en-IN")} attempts` : "No attempts yet"}
          />
        </div>
      )}

      <div className="mt-2.5">
        <Stars rating={quiz.rating} ratingCount={quiz.ratingCount} />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t-2 border-[var(--qs-line)] pt-3.5">
        <button type="button" onClick={() => onGoTo("edit")} className={BTN_PRI_SM}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button type="button" onClick={() => onGoTo("analytics")} className={BTN_SM}>
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics
        </button>
        <button type="button" onClick={() => onGoTo("responses")} className={BTN_SM}>
          <ClipboardList className="h-3.5 w-3.5" />
          Responses
        </button>
      </div>
    </motion.article>
  );
}

function MetaPill({
  icon: Icon,
  iconClass,
  text,
}: {
  icon: typeof HelpCircle;
  iconClass?: string;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[var(--qs-line)] px-2.5 py-1 text-[11px] font-bold text-[var(--qs-muted)]">
      <Icon className={cn("h-3.5 w-3.5", iconClass ?? "text-[var(--qs-muted)]")} />
      {text}
    </span>
  );
}

function Stars({ rating, ratingCount }: { rating: number; ratingCount: number }) {
  if (rating <= 0) return <span className="text-[12px] font-semibold text-[var(--qs-muted)]">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[12px]">
      <Star className="h-3.5 w-3.5 fill-[var(--qs-sun)] text-[var(--qs-sun)]" />
      <span className="font-extrabold tabular-nums text-[var(--qs-ink)]">{rating.toFixed(1)}</span>
      <span className="font-semibold text-[var(--qs-muted)]">
        from {ratingCount.toLocaleString("en-IN")} {ratingCount === 1 ? "rating" : "ratings"}
      </span>
    </span>
  );
}

/* ============================================================
   Skeletons
   ============================================================ */

function TilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] rounded-[18px]" />
      ))}
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 xl:flex-row xl:items-center">
      <Skeleton className="h-11 rounded-[12px] xl:w-80" />
      <Skeleton className="h-9 flex-1 rounded-full" />
    </div>
  );
}

function QuizCardSkeleton() {
  return (
    <div className="min-h-[218px] rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-[10px]" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-3 h-7 w-28 rounded-[10px]" />
      <Skeleton className="mt-3.5 h-6 w-full rounded-full" />
      <div className="mt-4 flex gap-2 border-t-2 border-[var(--qs-line)] pt-3.5">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
