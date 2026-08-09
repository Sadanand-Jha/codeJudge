"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  ListChecks,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getMyCollaborations, type CollaborationQuiz } from "@/services/quiz";
import { formatQuizCode } from "@/utils/quizCode";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ─── Status helpers ─── */
type StatusInfo = { text: string; dot: string; tone: string; pulse: boolean };

function isCollabLive(quiz: CollaborationQuiz): boolean {
  if (quiz.status !== "published") return false;
  const now = new Date();
  const start = quiz.starttime ? new Date(quiz.starttime) : null;
  const end = quiz.endtime ? new Date(quiz.endtime) : null;
  if (start && start > now) return false;
  if (end && end <= now) return false;
  return true;
}

function collabStatus(quiz: CollaborationQuiz): StatusInfo {
  if (isCollabLive(quiz)) return { text: "Live", dot: "bg-success", tone: "text-success", pulse: true };
  if (quiz.status === "draft") return { text: "Draft", dot: "bg-warning", tone: "text-warning", pulse: false };
  if (quiz.status === "archived") return { text: "Completed", dot: "bg-text-muted", tone: "text-text-muted", pulse: false };
  if (quiz.status === "published") {
    const now = new Date();
    const start = quiz.starttime ? new Date(quiz.starttime) : null;
    const end = quiz.endtime ? new Date(quiz.endtime) : null;
    if (start && start > now) return { text: "Scheduled", dot: "bg-accent-secondary", tone: "text-accent-secondary", pulse: false };
    if (end && end <= now) return { text: "Completed", dot: "bg-success", tone: "text-success", pulse: false };
    return { text: "Published", dot: "bg-success", tone: "text-success", pulse: false };
  }
  return { text: quiz.status || "Unknown", dot: "bg-text-muted", tone: "text-text-secondary", pulse: false };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function adminName(quiz: CollaborationQuiz): string {
  if (quiz.creator_name) return quiz.creator_name;
  const parts = [quiz.creator_first_name, quiz.creator_last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Quiz Admin";
}

function subjectInitial(name: string): string {
  return (name.trim().charAt(0) || "Q").toUpperCase();
}

/* ─── Skeleton ─── */
function CollaborationSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/5" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-white/5" />
                <div className="h-3 w-24 rounded bg-white/5" />
              </div>
            </div>
            <div className="h-5 w-20 rounded-full bg-white/5" />
          </div>
          <div className="mt-5 flex gap-6">
            <div className="h-3 w-16 rounded bg-white/5" />
            <div className="h-3 w-16 rounded bg-white/5" />
            <div className="h-3 w-16 rounded bg-white/5" />
          </div>
          <div className="mt-5 h-9 rounded-xl bg-white/5" />
        </div>
      ))}
    </div>
  );
}

/* ─── Empty state ─── */
function CollaborationEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="relative flex flex-col items-center px-6 py-16 text-center"
    >
      <div className="pointer-events-none absolute -top-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-fuchsia-500 opacity-20 blur-2xl" />
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 to-fuchsia-500/10 shadow-lg"
        >
          <Sparkles className="h-7 w-7 text-accent" strokeWidth={1.6} />
        </motion.div>
      </div>

      <h3 className="text-lg font-bold tracking-tight text-text-primary">No collaborations yet</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        Quizzes you collaborate on will appear here after you accept an invitation.
      </p>
    </motion.div>
  );
}

/* ─── Collaboration card ─── */
function CollaborationCard({ quiz, index }: { quiz: CollaborationQuiz; index: number }) {
  const status = collabStatus(quiz);
  const code = formatQuizCode(quiz.code);
  const admin = adminName(quiz);
  const updated = formatDate(quiz.updated_at || quiz.accepted_at || quiz.created_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.4, ease: EASE }}
      className="group relative h-full"
    >
      <Link
        href={`/quiz/${quiz.code}/settings/info`}
        className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-accent/30 group-hover:shadow-[0_16px_40px_-16px_rgba(124,58,237,0.35)] dark:group-hover:shadow-[0_16px_40px_-16px_rgba(236,72,153,0.3)]"
      >
        {/* subtle surface gradient + top highlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex flex-1 flex-col p-5">
          {/* top row: icon + title + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-fuchsia-500/10 ring-1 ring-inset ring-accent/20">
                <span className="text-base font-extrabold text-accent">{subjectInitial(quiz.name)}</span>
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card">
                  <ListChecks className="h-2.5 w-2.5 text-text-muted" />
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold leading-snug text-text-primary sm:text-base">
                  {quiz.name}
                </h3>
                <p className="mt-0.5 truncate font-mono text-[10px] tracking-wider text-text-muted">{code}</p>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                status.tone,
                status.pulse ? "border-success/30 bg-success/10" : "border-border bg-card-hover"
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                {status.pulse && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75" />
                )}
                <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", status.dot)} />
              </span>
              {status.text}
            </span>
          </div>

          {/* admin */}
          <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
            <Shield className="h-3.5 w-3.5 text-accent-secondary" />
            <span className="text-text-muted">Admin:</span>
            <span className="font-semibold text-text-primary">{admin}</span>
          </div>

          {/* metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-text-muted" />
              {quiz.total_questions || 0} Question{quiz.total_questions !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-text-muted" />
              {quiz.participants || 0} Participant{quiz.participants !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              Updated {updated}
            </span>
          </div>

          {/* primary action */}
          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <CheckCircle2 className="h-3 w-3 text-success" /> Collaborating
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-all duration-200 group-hover:bg-accent/15 group-hover:shadow-[0_4px_16px_rgba(124,58,237,0.25)]">
              Open Quiz Settings
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Error state ─── */
function CollaborationError({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative flex flex-col items-center px-6 py-14 text-center"
    >
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10">
        <Clock className="h-6 w-6 text-danger" />
      </div>
      <h3 className="text-base font-bold text-text-primary">Couldn&apos;t load collaborations</h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
        Something went wrong while fetching your collaborative quizzes.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-text-secondary transition-all hover:-translate-y-px hover:text-text-primary"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — Collaboration section
   ═══════════════════════════════════════════════════════════════ */
export default function CollaborationSection() {
  const [collabs, setCollabs] = useState<CollaborationQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set loading/error before async request kick-off
    setLoading(true);
    setError(false);
    getMyCollaborations()
      .then((data) => {
        if (!cancelled) setCollabs(data || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const collabsList = useMemo(() => collabs || [], [collabs]);

  if (loading) return <CollaborationSkeleton />;
  if (error) return <CollaborationError onRetry={() => setAttempt((a) => a + 1)} />;
  if (collabsList.length === 0) return <CollaborationEmpty />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {collabsList.map((quiz, i) => (
        <CollaborationCard key={quiz.id} quiz={quiz} index={i} />
      ))}
    </div>
  );
}
