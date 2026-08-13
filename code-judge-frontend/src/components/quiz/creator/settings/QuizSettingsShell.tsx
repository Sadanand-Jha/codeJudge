"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Loader2,
  Save,
  Square,
  Users,
  UserPlus,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Play,
  ListChecks,
} from "lucide-react";
import { updateQuiz } from "@/services/quiz";
import { useToast } from "@/hooks/useToast";
import { useQuizSettings } from "./QuizSettingsContext";
import { cn } from "@/lib/helpers";
import { saveQuizDetails } from "@/utils/quizStorage";

export const SETTINGS_SECTIONS = [
  { id: "info", label: "Quiz Info", icon: BookOpen, href: "info", tone: "pink" as const },
  { id: "registration", label: "Registration", icon: Users, href: "registration", tone: "violet" as const },
  { id: "collaborators", label: "Collaborators", icon: UserPlus, href: "collaborators", tone: "pink" as const },
  { id: "responses", label: "Responses", icon: BarChart3, href: "responses", tone: "blue" as const },
] as const;

type SectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  draft: {
    label: "DRAFT",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    dot: "bg-amber-500",
  },
  scheduled: {
    label: "SCHEDULED",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-500",
    dot: "bg-blue-500",
  },
  registration_open: {
    label: "REGISTRATION OPEN",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500",
    dot: "bg-cyan-500",
  },
  live: {
    label: "LIVE",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    dot: "bg-emerald-500",
  },
  ended: {
    label: "ENDED",
    badge: "border-red-500/30 bg-red-500/10 text-red-500",
    dot: "bg-red-500",
  },
  completed: {
    label: "COMPLETED",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-500",
    dot: "bg-violet-500",
  },
};

export default function QuizSettingsShell({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const pathname = usePathname();
  const {
    code,
    quizId,
    derivedStatus,
    isLive,
    isEnded,
    details,
    refresh,
    confirmingStart,
    confirmingEnd,
    actionBusy,
    requestStart,
    confirmStart,
    cancelStart,
    requestEnd,
    confirmEnd,
    cancelEnd,
  } = useQuizSettings();

  const [saving, setSaving] = useState(false);

  const activeSection: SectionId =
    SETTINGS_SECTIONS.find((s) => pathname.endsWith(`/${s.href}`))?.id ??
    (pathname.endsWith("/settings") ? "info" : "info");

  const statusMeta = STATUS_META[derivedStatus] || STATUS_META.draft;

  const settingsPath = (href: string) => `/quiz/${code}/settings/${href}`;

  const handleSaveDraft = async () => {
    saveQuizDetails(details);
    if (!quizId) {
      toast.success({
        title: "Draft saved",
        description: "Your quiz settings have been saved as a draft.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<{
        name: string;
        code: string;
        starttime: string;
        endtime: string;
        shuffleQuestions: boolean;
        shuffleOptions: boolean;
        showResultsImmediately: boolean;
        negativeMarking: boolean;
        leaderboard: boolean;
      }> = {
        name: details.name,
        code,
        shuffleQuestions: details.randomizeQuestions,
        shuffleOptions: details.randomizeOptions,
        showResultsImmediately: details.resultVisibility === "immediate",
        negativeMarking: details.negativeMarking,
        leaderboard: details.leaderboard,
      };
      if (details.startDate) payload.starttime = details.startDate;
      if (details.endDate) payload.endtime = details.endDate;

      await updateQuiz(String(quizId), payload);
      await refresh();
      toast.success({
        title: "Settings saved",
        description: "Your quiz settings have been updated.",
      });
    } catch (err) {
      console.error("Failed to save quiz settings:", err);
      toast.error({
        title: "Could not save settings",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== Main Content ===== */}
      <div className="flex-1 overflow-y-auto">
        {/* ===== Page Header ===== */}
        <div className="sticky top-0 z-20 h-14 border-b border-border bg-background px-6 py-2 lg:px-8">
          <div className="flex h-full w-full flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-text-primary">
                  {details.name.trim() ? details.name : "Quiz Settings"}
                </h1>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold", statusMeta.badge)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                  {statusMeta.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Configure your quiz settings and manage results.
              </p>
            </div>

            {/* Quick action area */}
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {quizId && !isEnded && (
                isLive ? (
                  <button
                    onClick={requestEnd}
                    disabled={actionBusy}
                    className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(239,68,68,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(239,68,68,0.5)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
                  >
                    {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    End Quiz
                  </button>
                ) : (
                  <button
                    onClick={requestStart}
                    disabled={actionBusy}
                    className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(16,185,129,0.5)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
                  >
                    {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Start Quiz
                  </button>
                )
              )}

              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-all duration-200 hover:border-border-hover hover:bg-card-hover disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>

          {/* ===== Mobile/Tablet Tab Nav ===== */}
          <div className="mt-2.5 flex gap-1 overflow-x-auto pb-1 lg:hidden">
            <Link
              href={`/quiz/${code}/problems`}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                pathname.includes("/problems")
                  ? "bg-pink-500/10 text-pink-500"
                  : "text-text-secondary hover:bg-pink-500/5"
              )}
            >
              <ListChecks className="h-4 w-4" strokeWidth={2.2} />
              Questions
            </Link>
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <Link
                  key={section.id}
                  href={settingsPath(section.href)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? section.tone === "pink"
                        ? "bg-pink-500/10 text-pink-500"
                        : "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-pink-500/5"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                  {section.label}
                </Link>
              );
            })}
          </div>
        </div>

        {children}
      </div>

      {/* ===== Start Quiz Confirmation (warning, green confirm) ===== */}
      <ConfirmActionModal
        open={confirmingStart}
        variant="start"
        icon={Zap}
        title="Start Quiz?"
        description="Are you sure you want to start this quiz?"
        consequences={[
          "Students will be able to participate once the quiz starts.",
          "Make sure all questions and settings are ready before continuing.",
          "Relevant registration and scheduling rules will apply.",
          "Starting the quiz changes its state to live.",
        ]}
        confirmLabel="Start Quiz"
        busy={actionBusy}
        onConfirm={confirmStart}
        onCancel={cancelStart}
      />

      {/* ===== End Quiz Confirmation (danger) ===== */}
      <ConfirmActionModal
        open={confirmingEnd}
        variant="danger"
        icon={Square}
        title="End Quiz?"
        description="Are you sure you want to end this quiz?"
        consequences={[
          "Students will no longer be able to attempt the quiz.",
          "All submitted responses and results will be preserved.",
          "This action may not be reversible.",
        ]}
        confirmLabel="End Quiz"
        busy={actionBusy}
        onConfirm={confirmEnd}
        onCancel={cancelEnd}
      />
    </div>
  );
}

/* =============================================
   Start / End confirmation modal
   ============================================= */
function ConfirmActionModal({
  open,
  variant,
  icon: Icon,
  title,
  description,
  consequences,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  variant: "start" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  consequences: string[];
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isDanger = variant === "danger";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-2xl border bg-card p-6 shadow-2xl",
              isDanger ? "border-danger/30" : "border-emerald-500/30"
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1">
              <div
                className={cn(
                  "h-full w-full",
                  isDanger ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-emerald-500 to-green-600"
                )}
              />
            </div>

            <div className="mb-4 flex items-start gap-3.5">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  isDanger
                    ? "bg-danger/10 text-danger shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                    : "bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
              </div>
            </div>

            <div
              className={cn(
                "space-y-2 rounded-xl border p-3.5",
                isDanger ? "border-danger/15 bg-danger/[0.04]" : "border-emerald-500/15 bg-emerald-500/[0.04]"
              )}
            >
              {consequences.map((line) => (
                <p key={line} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                  <AlertTriangle
                    className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isDanger ? "text-danger" : "text-emerald-500")}
                  />
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={busy}
                className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-text-primary transition-all hover:border-border-hover hover:bg-card-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-all disabled:opacity-50",
                  isDanger
                    ? "bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_4px_16px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_24px_rgba(239,68,68,0.55)] hover:brightness-105"
                    : "bg-gradient-to-r from-emerald-500 to-green-600 shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_24px_rgba(16,185,129,0.55)] hover:brightness-105"
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
