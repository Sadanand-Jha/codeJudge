"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  FileText,
  HelpCircle,
  RefreshCw,
  Shield,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { DEFAULT_AVATAR_URL, getAvatarUrlById, getPredefinedAvatarByUrl } from "@/config/dicebear";
import { cn } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";
import { getMyCollaborations, type CollaborationProject, type CollaborationUser } from "@/services/quiz";
import { formatQuizCode } from "@/utils/quizCode";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type CollabFilter = "all" | "creator" | "collaborator";

const COLLAB_FILTERS: { key: CollabFilter; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: Users },
  { key: "creator", label: "Created by me", icon: Shield },
  { key: "collaborator", label: "Collaborating", icon: UserPlus },
];

/* ─── Helpers ─── */

/** Resolve a stored avatar url (predefined / api / custom) to an img src. */
function resolveAvatar(url?: string | null): string {
  if (url) {
    const predefined = getPredefinedAvatarByUrl(url);
    if (predefined) return predefined.url;
    const match = url.match(/^\/api\/v1\/avatars\/(\d+)$/);
    if (match) return getAvatarUrlById(Number(match[1]));
    return url;
  }
  return DEFAULT_AVATAR_URL;
}

function displayName(u?: Pick<CollaborationUser, "first_name" | "last_name" | "username"> | null): string {
  if (!u) return "Unknown";
  if (u.first_name) return [u.first_name, u.last_name].filter(Boolean).join(" ");
  if (u.username) return `@${u.username}`;
  return "Unknown";
}

function isLiveProject(p: CollaborationProject): boolean {
  if (p.status !== "published") return false;
  const now = new Date();
  const start = p.starttime ? new Date(p.starttime) : null;
  const end = p.endtime ? new Date(p.endtime) : null;
  if (start && start > now) return false;
  if (end && end <= now) return false;
  return true;
}

function projectStatus(p: CollaborationProject): { text: string; dot: string; tone: string; pulse: boolean } {
  if (isLiveProject(p)) return { text: "Live", dot: "bg-success", tone: "text-success", pulse: true };
  if (p.status === "draft") return { text: "Draft", dot: "bg-warning", tone: "text-warning", pulse: false };
  if (p.status === "scheduled") return { text: "Scheduled", dot: "bg-accent-secondary", tone: "text-accent-secondary", pulse: false };
  if (p.status === "archived") return { text: "Archived", dot: "bg-text-muted", tone: "text-text-muted", pulse: false };
  if (p.status === "published") return { text: "Published", dot: "bg-success", tone: "text-success", pulse: false };
  return { text: p.status || "Unknown", dot: "bg-text-muted", tone: "text-text-secondary", pulse: false };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function lastUpdated(p: CollaborationProject): string {
  return timeAgo(p.updated_at || p.accepted_at || p.created_at);
}

/* ─── Filter bar ─── */

function CollaboratorsFilterBar({ active, onChange }: { active: CollabFilter; onChange: (v: CollabFilter) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {COLLAB_FILTERS.map((f) => {
        const isActive = active === f.key;
        const Icon = f.icon;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-all duration-200",
              isActive
                ? "border border-accent/40 bg-gradient-to-r from-accent/20 to-fuchsia-500/10 text-accent"
                : "border border-border text-text-secondary hover:border-accent/20 hover:bg-card-hover hover:text-text-primary"
            )}
          >
            {isActive && (
              <span className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_12px_rgba(124,58,237,0.20)] dark:shadow-[0_0_12px_rgba(236,72,153,0.15)]" />
            )}
            <Icon className="h-3.5 w-3.5" />
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Avatar stack (+N) ─── */

function CollaboratorAvatars({ collaborators, currentUserId, limit = 4 }: { collaborators: CollaborationUser[]; currentUserId?: string; limit?: number }) {
  const others = collaborators.filter((c) => String(c.user_id) !== String(currentUserId));
  if (others.length === 0) return null;
  const shown = others.slice(0, limit);
  const extra = others.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((c, i) => (
          <div
            key={String(c.user_id)}
            title={displayName(c)}
            className="relative h-6 w-6 overflow-hidden rounded-full border border-border bg-card ring-2 ring-card transition-transform duration-200 hover:z-10 hover:-translate-y-0.5"
            style={{ zIndex: i }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveAvatar(c.avatar_url)} alt={displayName(c)} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      {extra > 0 && (
        <span className="z-10 ml-1.5 inline-flex h-6 items-center rounded-full border border-border bg-card-hover px-2 text-[10px] font-bold text-text-secondary">
          +{extra}
        </span>
      )}
    </div>
  );
}

/* ─── Card ─── */

function CollaboratorCard({ project, index, currentUserId }: { project: CollaborationProject; index: number; currentUserId?: string }) {
  const status = projectStatus(project);
  const code = formatQuizCode(project.code);
  const creatorName = displayName(project.creator);
  const updated = lastUpdated(project);
  const isCreator = project.my_role === "creator";
  const isLive = status.pulse;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.4, ease: EASE }}
      className="group relative h-full"
    >
      <Link
        href={`/quiz/${project.code}/settings/info`}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200",
          isLive && "border-l-2 border-l-success/60",
          "group-hover:-translate-y-0.5 group-hover:border-accent/30 group-hover:bg-card-hover",
          "group-hover:shadow-[0_16px_40px_-16px_rgba(124,58,237,0.35)] dark:group-hover:shadow-[0_16px_40px_-16px_rgba(236,72,153,0.3)]"
        )}
      >
        {/* surface gradient + top hairline */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
        {isLive && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-success/0 via-success/60 to-success/0" />
        )}

        <div className="relative flex flex-1 flex-col p-5">
          {/* top: icon tile + name + code */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-fuchsia-500/10 ring-1 ring-inset ring-accent/20">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold leading-snug text-text-primary transition-colors group-hover:text-accent sm:text-base">
                  {project.name}
                </h3>
                <p className="mt-0.5 truncate font-mono text-[10px] tracking-wider text-text-muted">{code}</p>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                status.pulse ? "border-success/30 bg-success/10" : "border-border bg-card-hover",
                status.tone
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

          {/* creator + role */}
          <div className="mt-4 flex items-center gap-2.5">
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border bg-card ring-2 ring-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveAvatar(project.creator_avatar_url)} alt={creatorName} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-text-secondary">
                <span className="text-text-muted">By</span>{" "}
                <span className="font-semibold text-text-primary">{creatorName}</span>
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                isCreator
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary"
              )}
            >
              {isCreator ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
              {isCreator ? "Creator" : "Collaborator"}
            </span>
          </div>

          {/* metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-text-muted" />
              {project.total_questions || 0} Question{project.total_questions !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              Updated {updated}
            </span>
          </div>

          {/* footer: collaborators + action */}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex min-w-0 flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                {isCreator ? "Collaborators" : "Team"}
              </span>
              <CollaboratorAvatars collaborators={project.collaborators} currentUserId={currentUserId} />
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                isCreator
                  ? "border-accent/25 bg-accent/10 text-accent group-hover:bg-accent/15 group-hover:shadow-[0_4px_16px_rgba(124,58,237,0.25)]"
                  : "border-accent-secondary/25 bg-accent-secondary/10 text-accent-secondary group-hover:bg-accent-secondary/15"
              )}
            >
              {isCreator ? "Manage" : "Open"}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Skeleton ─── */

function CollaboratorsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/5" />
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-white/5 sm:w-48" />
                <div className="h-3 w-24 rounded bg-white/5" />
              </div>
            </div>
            <div className="h-5 w-16 rounded-full bg-white/5" />
          </div>
          <div className="mt-4 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-white/5" />
            <div className="h-3 w-28 rounded bg-white/5" />
            <div className="ml-auto h-5 w-20 rounded-full bg-white/5" />
          </div>
          <div className="mt-4 flex gap-x-4">
            <div className="h-3 w-20 rounded bg-white/5" />
            <div className="h-3 w-24 rounded bg-white/5" />
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
            <div className="h-6 w-16 rounded-full bg-white/5" />
            <div className="h-8 w-20 rounded-lg bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Empty state ─── */

function CollaboratorsEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent to-fuchsia-500 opacity-30 blur-xl transition-opacity duration-300 group-hover:opacity-50" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/25 bg-card shadow-lg">
            <Users className="h-9 w-9 text-accent" strokeWidth={1.6} />
          </div>
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card">
            <Sparkles className="h-3 w-3 text-fuchsia-500" />
          </span>
        </div>

        <h3 className="text-xl font-bold tracking-tight text-text-primary">No collaborations yet</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Quizzes you collaborate on will appear here once you accept an invitation, or after you add collaborators to a
          quiz you created.
        </p>

        <Link
          href="/quiz/create"
          className={cn(
            "mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl",
            "bg-gradient-to-r from-accent to-fuchsia-500 px-5 py-2.5",
            "text-xs font-semibold text-white shadow-lg shadow-accent/25",
            "transition-all duration-200 hover:scale-105 hover:shadow-accent/50"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Create your first quiz
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── Error state ─── */

function CollaboratorsError({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative flex flex-col items-center px-6 py-14 text-center"
    >
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10">
        <FileText className="h-6 w-6 text-danger" />
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

/* ─── Main section ─── */

export default function CollaboratorsSection() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [projects, setProjects] = useState<CollaborationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<CollabFilter>("all");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set loading/error before async request kick-off
    setLoading(true);
    setError(false);
    getMyCollaborations()
      .then((data) => {
        if (!cancelled) setProjects(data || []);
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

  const filtered = useMemo(() => {
    const list = projects || [];
    if (filter === "all") return list;
    return list.filter((p) => p.my_role === filter);
  }, [projects, filter]);

  const counts = useMemo(() => {
    const list = projects || [];
    return {
      all: list.length,
      creator: list.filter((p) => p.my_role === "creator").length,
      collaborator: list.filter((p) => p.my_role === "collaborator").length,
    };
  }, [projects]);

  if (loading) return <CollaboratorsSkeleton />;
  if (error) return <CollaboratorsError onRetry={() => setAttempt((a) => a + 1)} />;

  return (
    <div className="space-y-4">
      {/* count + filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          <span className="font-bold text-text-primary">{counts.all}</span>{" "}
          {counts.all === 1 ? "project" : "projects"} ·{" "}
          <span className="font-semibold text-accent">{counts.creator}</span> created ·{" "}
          <span className="font-semibold text-accent-secondary">{counts.collaborator}</span> collaborating
        </p>
        <CollaboratorsFilterBar active={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <CollaboratorsEmpty />
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {filtered.map((project, i) => (
              <CollaboratorCard key={project.id} project={project} index={i} currentUserId={currentUserId} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
