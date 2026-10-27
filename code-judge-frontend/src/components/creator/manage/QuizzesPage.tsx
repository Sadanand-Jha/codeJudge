"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  // MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { MaskedCopyCode } from "@/components/creator/common/MaskedCopyCode";
import {
  ShareQuizDialog,
  WhatsAppIcon,
} from "@/components/creator/common/ShareQuizDialog";
import { AiGenerateButton } from "@/components/creator/common/AiGenerateButton";
import { useData } from "@/lib/hooks/useData";
import { Skeleton } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";
import { formatDurationMinutes } from "@/lib/formatters";
import { deriveQuizStatus, type EffectiveQuizStatus } from "@/lib/quizStatus";
import { deleteQuiz, getMyCreatedQuizzes, type Quiz } from "@/services/quiz";
import { toast } from "@/lib/toast";
import { WHOLE_QUIZ_AI_ENABLED } from "@/config/creatorFeatures";

type QuizStatus = EffectiveQuizStatus;
type TabId = "all" | QuizStatus;

interface QuizCard {
  id: string;
  code: string;
  title: string;
  subject: string;
  questions: number;
  attempts: number;
  rating: number;
  status: QuizStatus;
  duration: number | null;
}

type QuizListRecord = Quiz & {
  subject?: string | null;
  total_questions?: number | null;
  attempts?: number | null;
  rating?: number | null;
  rating_count?: number | null;
};

function mapQuizToCard(q: QuizListRecord): QuizCard {
  return {
    id: String(q.id),
    code: q.code || "",
    title: q.name,
    subject: q.subject || "General",
    questions: Number(q.total_questions) || 0,
    attempts: Number(q.attempts) || 0,
    rating: Number(q.rating) || 0,
    status: deriveQuizStatus(q),
    duration: q.duration ?? null,
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
  completed: { label: "Completed", tone: "text-[#2457d6]", dot: "#2457d6" },
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
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em]";

export function QuizzesPage({ demoState }: { demoState?: "empty" | "error" }) {
  const router = useRouter();
  const [filter, setFilter] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  // const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
    const rated = list.filter((q) => q.rating > 0);
    return {
      total: list.length,
      live: list.filter((q) => q.status === "live").length,
      responses: list.reduce((sum, q) => sum + q.attempts, 0),
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
    // setOpenMenuId(null);
    router.push(`/creator/quizzes/${quizId}/${page}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="qs-display text-[22px] font-extrabold leading-[1.08] tracking-[-0.025em] text-[var(--qs-ink)] sm:text-[27px] lg:text-[30px]">
            Your quizzes
          </h1>
          <p className="mt-1.5 text-[11px] text-[var(--qs-muted)] sm:text-[12px]">
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
            <p className="flex flex-wrap items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
              AI service
              {!WHOLE_QUIZ_AI_ENABLED && (
                <span className="rounded-full border-2 border-[#a85d00]/30 bg-[#fff3d6] px-2 py-0.5 text-[10px] tracking-[0.06em] text-[#a85d00]">
                  Coming soon
                </span>
              )}
            </p>
            <h2 className="qs-display mt-1 text-[20px] font-extrabold text-[var(--qs-ink)]">
              Build your next quiz with AI
            </h2>
            <p className="mt-1 text-[13px] text-[var(--qs-muted)]">
              {WHOLE_QUIZ_AI_ENABLED
                ? "Upload a problem list and generate a complete, review-ready quiz in minutes."
                : "AI quiz generation from a problem list is coming soon."}
            </p>
          </div>
          <AiGenerateButton
            href="/creator/quizzes/create"
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
            Create one from scratch. AI quiz generation is coming soon.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/creator/quizzes/create" className={BTN_PRI_SM}>
              <Plus className="h-3.5 w-3.5" />
              New quiz
            </Link>
            <AiGenerateButton
              href="/creator/quizzes/create"
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
              label="Total responses"
              value={stats.responses.toLocaleString("en-IN")}
              hint={stats.responses > 0 ? "Across all quizzes" : "No responses yet"}
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
                  // menuOpen={openMenuId === quiz.id}
                  // onToggleMenu={() => setOpenMenuId((current) => (current === quiz.id ? null : quiz.id))}
                  // onCloseMenu={() => setOpenMenuId(null)}
                  onGoTo={(page) => goTo(quiz.id, page)}
                  // onDelete={() => {
                  //   setOpenMenuId(null);
                  //   setDeleteTarget(quiz);
                  // }}
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
      {status === "completed" ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {STATUS_META[status].label}
    </span>
  );
}

function QuizCardItem({
  quiz,
  index,
  // menuOpen,
  // onToggleMenu,
  // onCloseMenu,
  onGoTo,
  // onDelete,
}: {
  quiz: QuizCard;
  index: number;
  // menuOpen: boolean;
  // onToggleMenu: () => void;
  // onCloseMenu: () => void;
  onGoTo: (page: "edit" | "analytics" | "responses") => void;
  // onDelete: () => void;
}) {
  const hasAttempts = quiz.attempts > 0;
  const durationLabel = formatDurationMinutes(quiz.duration);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.25 }}
      className="relative flex flex-col rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 transition-colors hover:border-[var(--qs-brand)]"
    >
      <div className="flex items-start justify-between gap-2">
        <StatusPill status={quiz.status} />
        {/* Three-dot actions menu — hidden along with delete quiz
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
        */}
      </div>

      <h3 className="qs-display mt-4 break-words text-[20px] font-extrabold leading-[1.25] text-[var(--qs-ink)]" title={quiz.title}>
        {quiz.title}
      </h3>

      {quiz.questions === 0 ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border-2 border-dashed border-[var(--qs-brand)]/50 px-3.5 py-2.5">
          <p className="min-w-0 text-[12px] font-semibold leading-5 text-[var(--qs-muted)]">
            No questions yet — finish setup before publishing.
          </p>
          <button type="button" onClick={() => onGoTo("edit")} className={cn(BTN_SM, "shrink-0")}>
            Add questions
          </button>
        </div>
      ) : (
        <div className="my-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] px-3 py-[5px] text-[13px] font-bold text-[var(--qs-muted)]">
            {quiz.questions} {quiz.questions === 1 ? "question" : "questions"}
          </span>
          {durationLabel && (
            <span className="inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] px-3 py-[5px] text-[13px] font-bold text-[var(--qs-muted)]">
              {durationLabel}
            </span>
          )}
          <span className="inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] px-3 py-[5px] text-[13px] font-bold text-[var(--qs-muted)]">
            {hasAttempts ? `${quiz.attempts.toLocaleString("en-IN")} ${quiz.attempts === 1 ? "attempt" : "attempts"}` : "No attempts yet"}
          </span>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t-2 border-[var(--qs-line)] pt-3.5">
        <button
          type="button"
          onClick={() => onGoTo("edit")}
          className="b b-pri sm px-4 py-2"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onGoTo("analytics")}
          className="inline-flex items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() => onGoTo("responses")}
          className="inline-flex items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Responses
        </button>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label={`Share ${quiz.title} on WhatsApp`}
          title="Share on WhatsApp"
          className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[#25d366] hover:bg-[#25d366]/10"
        >
          <WhatsAppIcon className="h-4 w-4 text-[#25d366]" />
          Share on WhatsApp
        </button>
      </div>

      {shareOpen && (
        <ShareQuizDialog
          quiz={{
            id: quiz.id,
            title: quiz.title,
            code: quiz.code,
            questions: quiz.questions,
            status: quiz.status,
            duration: quiz.duration,
          }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </motion.article>
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
    <div className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-[10px]" />
      </div>
      <Skeleton className="mt-4 h-5 w-3/4" />
      <div className="my-4 flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2 border-t-2 border-[var(--qs-line)] pt-3.5">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
}
