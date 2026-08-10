"use client";

import { useEffect, useState } from "react";
import type { ClipboardEvent, DragEvent, MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  ListChecks,
  Loader2,
  Plus,
  Square,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { isQuizProblemsPath } from "@/lib/quizWorkspace";
import { useQuizSettings } from "./QuizSettingsContext";
import { SETTINGS_SECTIONS, STATUS_META } from "./QuizSettingsShell";
import { useQuizProblemsStore, getQuestionStatus } from "@/store/quizProblemsStore";
import { type CreatorQuestion } from "@/components/quiz/creator/types";
import ProblemDeleteModal from "./ProblemDeleteModal";

const SLIDE = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

/**
 * Behavior-only protection for the quiz sidebar & navigation. Prevents
 * native dragging, dropping, text selection (see also .quiz-sidebar-lock
 * CSS), copying, cutting, and right-click on every sidebar item without
 * touching clicks or navigation logic.
 *
 * NOTE: `onDragStart` is intentionally NOT included in `sidebarProtect` —
 * framer-motion's motion.* elements reserve `onDragStart` for their own
 * drag-gesture system, so it cannot be used on the <motion.aside> shells.
 * Native dragging on the shell is still impossible because the container
 * and all descendants are non-draggable (`draggable={false}` +
 * `user-drag: none`), and every interactive child applies the full
 * `itemProtect` set which does block `dragstart`.
 */
const itemProtect = {
  draggable: false as const,
  onDragStart: (e: DragEvent) => e.preventDefault(),
  onDragOver: (e: DragEvent) => e.preventDefault(),
  onDragEnter: (e: DragEvent) => e.preventDefault(),
  onDrop: (e: DragEvent) => e.preventDefault(),
  onCopy: (e: ClipboardEvent) => e.preventDefault(),
  onCut: (e: ClipboardEvent) => e.preventDefault(),
  onContextMenu: (e: MouseEvent) => e.preventDefault(),
};

const sidebarProtect = {
  draggable: false as const,
  onDragOver: (e: DragEvent) => e.preventDefault(),
  onDragEnter: (e: DragEvent) => e.preventDefault(),
  onDrop: (e: DragEvent) => e.preventDefault(),
  onCopy: (e: ClipboardEvent) => e.preventDefault(),
  onCut: (e: ClipboardEvent) => e.preventDefault(),
  onContextMenu: (e: MouseEvent) => e.preventDefault(),
};

/**
 * Nested quiz creator workspace.
 *
 * The app project sidebar slides out of the viewport (handled by AppLayout)
 * and this frame takes its place. It renders a persistent Quiz Settings
 * sidebar that survives navigation between settings sections and the problem
 * workspace, plus a problem navigation column when editing problems.
 *
 * Desktop:
 *   [ Quiz Settings ][ Problem Nav ][ Editor ]   (problem workspace)
 *   [ Quiz Settings ][ Settings Content ]        (settings workspace)
 *
 * Mobile: the sidebars are hidden; each page provides its own mobile nav.
 */
export default function QuizWorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { code, quizId, derivedStatus, isLive, isEnded, startValidationError, requestStart } =
    useQuizSettings();
  const [starting, setStarting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ question: CreatorQuestion; index: number } | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const inProblems = isQuizProblemsPath(pathname);

  const problems = useQuizProblemsStore((s) => s.problems);
  const activeProblemId = useQuizProblemsStore((s) => s.activeProblemId);
  const hydrate = useQuizProblemsStore((s) => s.hydrate);
  const setActiveProblem = useQuizProblemsStore((s) => s.setActiveProblem);
  const addProblem = useQuizProblemsStore((s) => s.addProblem);
  const deleteProblem = useQuizProblemsStore((s) => s.deleteProblem);
  const duplicateProblem = useQuizProblemsStore((s) => s.duplicateProblem);
  const deleteAllProblems = useQuizProblemsStore((s) => s.deleteAllProblems);

  useEffect(() => {
    if (inProblems) hydrate();
  }, [inProblems, hydrate]);

  const activeSection =
    SETTINGS_SECTIONS.find((s) => pathname.endsWith(`/${s.href}`))?.id ?? "info";
  const settingsPath = (href: string) => `/quiz/${code}/settings/${href}`;
  const statusMeta = STATUS_META[derivedStatus] || STATUS_META.draft;

  const handleAddProblem = () => {
    const id = addProblem();
    router.push(`/quiz/${code}/problems/${id}`);
  };

  const handleDeleteAll = () => {
    if (problems.length === 0) return;
    deleteAllProblems();
    setConfirmDeleteAll(false);
    router.push(`/quiz/${code}/problems`);
  };

  const handleStartInstantly = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await requestStart();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== Quiz Settings sidebar — replaces the project sidebar ===== */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={SLIDE}
        {...sidebarProtect}
        className="quiz-sidebar-lock fixed left-0 top-14 bottom-0 z-40 hidden w-60 flex-col border-r border-border bg-card lg:flex"
      >
        <nav className="settings-scroll flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link
              {...itemProtect}
              href="/quiz"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:bg-pink-500/5 hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Quiz Dashboard
            </Link>
          </div>

          {/* ===== Questions — first item, opens the question builder on the right ===== */}
          <p className="px-3 pb-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Create
          </p>
          <div className="space-y-1">
            <Link
              {...itemProtect}
              href={`/quiz/${code}/problems`}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                inProblems
                  ? "bg-pink-500/10 text-pink-500 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.2)]"
                  : "text-text-secondary hover:bg-pink-500/5 hover:text-text-primary"
              )}
            >
              <ListChecks
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  inProblems ? "text-pink-500" : "text-text-muted group-hover:text-text-primary"
                )}
                strokeWidth={inProblems ? 2.2 : 2}
              />
              <span className={cn("font-medium", inProblems && "font-semibold")}>Questions</span>
              {problems.length > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500/15 px-1.5 text-[10px] font-bold text-pink-500">
                  {problems.length}
                </span>
              )}
            </Link>
          </div>

          <p className="px-3 pb-3 pt-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Settings
          </p>
          <div className="space-y-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isPink = section.tone === "pink";
              return (
                <Link
                  {...itemProtect}
                  key={section.id}
                  href={settingsPath(section.href)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                    isActive
                      ? isPink
                        ? "bg-pink-500/10 text-pink-500 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.2)]"
                        : "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(124,58,237,0.2)]"
                      : "text-text-secondary hover:bg-pink-500/5 hover:text-text-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? isPink
                          ? "text-pink-500"
                          : "text-accent"
                        : "text-text-muted group-hover:text-text-primary"
                    )}
                    strokeWidth={isActive ? 2.2 : 2}
                  />
                  <span className={cn("font-medium", isActive && "font-semibold")}>{section.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="activeQuizSettingsIndicator"
                      className={cn("ml-auto h-1.5 w-1.5 rounded-full", isPink ? "bg-pink-500" : "bg-accent")}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ===== Quick action (Start Instantly) ===== */}
          <div className="mt-8 rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Quick Action
            </p>
            <div className="mt-3">
              {quizId && !isEnded ? (
                isLive ? (
                  <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-xs font-bold text-white opacity-90">
                    <Square className="h-4 w-4" /> Live
                  </span>
                ) : (
                  <button
                    {...itemProtect}
                    onClick={handleStartInstantly}
                    disabled={starting}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-xs font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(16,185,129,0.4)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {starting ? "Checking..." : "Start Instantly"}
                  </button>
                )
              ) : (
                <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card-hover px-4 py-3 text-xs font-bold text-text-muted">
                  {isEnded ? "Quiz Ended" : "Save to enable"}
                </span>
              )}
            </div>
            <p className="mt-2 text-[10px] font-medium leading-relaxed text-text-muted">
              {isLive
                ? "The quiz is live. Ending it stops further participation."
                : isEnded
                ? "This quiz has ended."
                : "Starts the quiz now using your current saved settings."}
            </p>
            {startValidationError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-2.5 text-[10px] font-medium leading-relaxed text-amber-500">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{startValidationError}</span>
              </div>
            )}
          </div>

          {/* ===== Quiz status ===== */}
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Quiz Status
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                  statusMeta.badge
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                {statusMeta.label}
              </span>
            </div>
          </div>
        </nav>
      </motion.aside>

      {/* ===== Problem navigation column (level 2) ===== */}
      <AnimatePresence>
        {inProblems && (
          <motion.aside
            key="quiz-problem-nav"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={SLIDE}
            {...sidebarProtect}
            className="quiz-sidebar-lock fixed left-60 top-14 bottom-0 z-30 hidden w-56 flex-col border-r border-border bg-card-hover/50 lg:flex"
          >
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Problems
                </p>
                <button
                  {...itemProtect}
                  onClick={handleAddProblem}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 transition-colors hover:bg-pink-500/20"
                  title="Add problem"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[10px] text-text-muted">{problems.length} total</p>
                {problems.length > 0 && !isLive && !isEnded && (
                  <button
                    {...itemProtect}
                    onClick={() => setConfirmDeleteAll(true)}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Delete all problems"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete All
                  </button>
                )}
              </div>
            </div>

            <div className="settings-scroll flex-1 space-y-1 overflow-y-auto p-2">
              {problems.map((p, i) => {
                const isActive = p.id === activeProblemId;
                const status = getQuestionStatus(p);
                return (
                  <Link
                    {...itemProtect}
                    key={p.id}
                    href={`/quiz/${code}/problems/${p.id}`}
                    onClick={() => setActiveProblem(p.id)}
                    className={cn(
                      "group relative flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200",
                      isActive
                        ? "border-pink-500/30 bg-pink-500/10 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.15)]"
                        : "border-transparent hover:border-border hover:bg-card"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                        isActive
                          ? "bg-gradient-to-br from-[#EC4899] to-[#7C3AED] text-white"
                          : "bg-card text-text-muted"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-xs font-medium",
                          isActive ? "text-text-primary" : "text-text-secondary"
                        )}
                      >
                        {p.title.trim() || `Problem ${i + 1}`}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-text-muted">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            status === "complete"
                              ? "bg-success"
                              : status === "missing_answer"
                              ? "bg-warning"
                              : "bg-text-muted"
                          )}
                        />
                        {status === "complete"
                          ? "Complete"
                          : status === "missing_answer"
                          ? "Needs answer"
                          : "Draft"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        {...itemProtect}
                        onClick={(e) => {
                          e.preventDefault();
                          const id = duplicateProblem(p.id);
                          router.push(`/quiz/${code}/problems/${id}`);
                        }}
                        className="rounded-md p-1 text-text-muted hover:bg-card-hover hover:text-text-primary"
                        title="Duplicate problem"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        {...itemProtect}
                        onClick={(e) => {
                          e.preventDefault();
                          deleteProblem(p.id);
                        }}
                        className="rounded-md p-1 text-text-muted hover:bg-danger/10 hover:text-danger"
                        title="Delete problem"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  </Link>
                );
              })}
              {problems.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <p className="text-xs text-text-muted">No problems yet.</p>
                  <button
                    {...itemProtect}
                    onClick={handleAddProblem}
                    className="mt-2 text-[11px] font-semibold text-pink-500 hover:text-pink-400"
                  >
                    + Add Problem
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ===== Content ===== */}
      <div
        className={cn(
          "flex-1 min-w-0 transition-[padding] duration-300 ease-out",
          inProblems ? "lg:pl-[464px]" : "lg:pl-60"
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      <ProblemDeleteModal
        question={deleteTarget?.question ?? null}
        index={deleteTarget?.index}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Delete All confirmation */}
      <AnimatePresence>
        {confirmDeleteAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDeleteAll(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Delete all problems?</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    This will remove all {problems.length} problem{problems.length !== 1 ? "s" : ""} from the quiz. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  {...itemProtect}
                  onClick={() => setConfirmDeleteAll(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  {...itemProtect}
                  onClick={handleDeleteAll}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-danger to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(239,68,68,0.35)] transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
