"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Check, BarChart3, Copy, Loader2 } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { buildShareMessage, WhatsAppIcon } from "@/components/creator/common/ShareQuizDialog";
import { copyQuizCode } from "@/services/quiz";
import { useStudio } from "../StudioProvider";
import { useAuthStore } from "@/store/authStore";
import { useSavedAvatar } from "@/store/avatarStore";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import { StudioStepLayout } from "../primitives";
import { formatDateTimeIST } from "../components/timing/helpers";
import { cn } from "@/lib/helpers";

const TILE_TONES = [
  { bg: "bg-[var(--qs-brand)]", text: "text-[var(--qs-on-brand)]" },
  { bg: "bg-[var(--qs-ok)]", text: "text-[var(--qs-on-brand)]" },
  { bg: "bg-[var(--qs-sun)]", text: "text-[#1a1240]" },
  { bg: "bg-[var(--qs-bad)]", text: "text-[var(--qs-on-brand)]" },
  { bg: "bg-[var(--qs-blue)]", text: "text-[var(--qs-on-brand)]" },
  { bg: "bg-[var(--qs-warn)]", text: "text-[var(--qs-on-brand)]" },
  { bg: "bg-[var(--qs-ink)]", text: "text-[var(--qs-bg)]" },
];

function buildJoinLink(code: string): string {
  const normalized = code.replace(/\s+/g, "");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/quiz/join?code=${encodeURIComponent(normalized)}`;
}

export function PublishStep({
  onPublish,
  embedded = false,
  bare = false,
}: {
  onPublish: () => void;
  embedded?: boolean;
  /** Render without the outer card so it can sit inside a combined panel. */
  bare?: boolean;
}) {
  const { state, summary, saveToServer, editMode } = useStudio();
  const creatorAvatar = useSavedAvatar();
  const creatorName = useAuthStore(
    (s) => s.user?.displayName || s.user?.username || null
  );
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSaveChanges = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveToServer();
      toast.success({
        title: state.info.title || "Quiz saved",
        description: "Your changes have been saved.",
      });
      router.push("/creator/quizzes");
    } catch (err) {
      toast.error({
        title: "Could not save quiz",
        description: getApiErrorMessage(err, "Something went wrong. Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { code } = await saveToServer({ publish: true });
      const link = buildJoinLink(code);
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success({
        title: state.info.title || "Quiz published",
        description: "Quiz saved and join link copied to clipboard.",
      });
      onPublish();
    } catch (err) {
      toast.error({
        title: "Could not start quiz",
        description: getApiErrorMessage(err, "Something went wrong. Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const isScheduled = state.info.quizLifecycle === "scheduled" && Boolean(state.info.startDate);
  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: "Title", value: state.info.title || "Untitled Quiz" },
    { label: "Questions", value: String(summary.questionCount) },
    {
      label: "Responses",
      value: isScheduled ? "Open during the scheduled window" : "Open until you end the quiz",
    },
    { label: "Audience", value: state.audience.mode === "classroom" ? "Room" : "Anyone" },
    {
      label: "Price",
      value: state.pricing.mode === "paid" ? "₹" + state.pricing.price : "Free",
    },
    {
      label: "Start",
      value: state.info.startDate ? formatDateTimeIST(state.info.startDate, "Immediately") : "Immediately",
    },
    {
      label: "End",
      value: state.info.endDate ? formatDateTimeIST(state.info.endDate, "Manual") : "Manual",
    },
  ];

  return (
    <StudioStepLayout width="compact" className={bare ? undefined : "sm:py-8"} embedded={embedded}>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        !bare && "overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
      )}
    >
        {!bare && (
          <div className="border-b-2 border-[var(--qs-line)] px-6 py-5">
            <h2 className="text-base font-extrabold text-[var(--qs-ink)]">
              {editMode ? "Ready to save?" : "Ready to publish?"}
            </h2>
          </div>
        )}

        <div className={cn(bare ? "min-w-0" : "px-6 py-5")}>
          <div className="flex items-center gap-4 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
            {state.branding.logoUrl ? (
              <img src={state.branding.logoUrl} alt="thumb" className="h-14 w-20 rounded-[10px] border-2 border-[var(--qs-line)] object-cover" />
            ) : creatorAvatar ? (
              <img
                src={creatorAvatar.url}
                alt={`${creatorName || "Quiz creator"} avatar`}
                title={creatorName || "Quiz creator"}
                className="h-14 w-14 shrink-0 rounded-full border-2 border-[var(--qs-line)] object-cover"
              />
            ) : (
              <div className="flex h-14 w-20 items-center justify-center rounded-[10px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                No cover
              </div>
            )}
            <div className="min-w-0">
              <p className="break-words text-sm font-extrabold text-[var(--qs-ink)]">{state.info.title || "Untitled Quiz"}</p>
              <p className="mt-0.5 break-words text-xs font-medium text-[var(--qs-muted)]">
                {state.info.shortDescription || "No description."}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2">
            {rows.map((r, index) => (
              <div
                key={r.label}
                className={cn(
                  "flex min-h-[84px] min-w-0 flex-col justify-between rounded-[12px] border-2 border-black/10 px-2.5 py-2.5 shadow-[2px_2px_0_rgba(26,18,64,0.18)] sm:px-3",
                  TILE_TONES[index % TILE_TONES.length].bg,
                  TILE_TONES[index % TILE_TONES.length].text
                )}
              >
                <dt className="text-[9px] font-extrabold uppercase tracking-[0.08em] opacity-70">{r.label}</dt>
                <dd className="mt-1 break-words text-[11px] font-bold leading-snug">{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--qs-line)] pt-4">
            <p className="text-[11px] font-medium text-[var(--qs-muted)]">
              {editMode
                ? "Save the latest details to your account."
                : isScheduled
                  ? "Your quiz will be saved and scheduled."
                  : "Your quiz will be saved and made live."}
            </p>
            {editMode ? (
              <button
                type="button"
                onClick={() => void handleSaveChanges()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Save
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" /> Starting…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> {isScheduled ? "Schedule Quiz" : "Start Quiz"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Publish confirmation */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center bg-[#1a1240]/60 p-4"
          onClick={() => !saving && setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[8px_8px_0_var(--qs-sun)]"
          >
            {/* Header */}
            <div className="border-b-2 border-[var(--qs-line)] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
                  <Send className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--qs-ink)]">
                    {isScheduled ? "Schedule this quiz?" : "Start this quiz?"}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                    {isScheduled
                      ? "Participants can join and attempt throughout the scheduled window. Responses stop automatically at the end time."
                      : "This will make the quiz live immediately. Participants can start attempting it as soon as you confirm."}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-6 py-5">
              <dl className="divide-y-2 divide-[var(--qs-line)] rounded-[14px] border-2 border-[var(--qs-line)]">
                {[
                  { label: "Quiz", value: state.info.title || "Untitled Quiz" },
                  { label: "Questions", value: String(summary.questionCount) },
                  {
                    label: "Responses",
                    value: isScheduled ? "Open during the scheduled window" : "Open until you end the quiz",
                  },
                  {
                    label: "Audience",
                    value:
                      state.audience.mode === "classroom"
                        ? `Rooms (${(state.audience.roomIds ?? []).length})`
                        : state.audience.mode,
                  },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <dt className="font-bold text-[var(--qs-muted)]">{r.label}</dt>
                    <dd className="max-w-[65%] break-words text-right font-bold text-[var(--qs-ink)]">{r.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 rounded-[12px] border-2 border-[#a85d00]/40 bg-[#fff3d6] px-3.5 py-2.5 text-xs font-medium leading-relaxed text-[#a85d00]">
                Once students start attempting, questions and key settings become
                locked. You can unpublish later if needed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-4 py-2 text-sm font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" /> Publishing…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> {isScheduled ? "Yes, Schedule" : "Yes, Publish"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudioStepLayout>
  );
}

export function SuccessStep({ onDashboard }: { onDashboard: () => void }) {
  const { state, summary } = useStudio();
  const localCode = state.info.code.replace(/\s+/g, "");
  const [code, setCode] = useState(localCode);
  const [copying, setCopying] = useState(false);
  const title = state.info.title || "Untitled Quiz";
  const isScheduled = state.info.quizLifecycle === "scheduled" && Boolean(state.info.startDate);
  const displayCode = code || localCode;
  const link = buildJoinLink(displayCode);
  const shareQuiz = {
    id: state.serverQuizId ?? displayCode,
    title,
    code: displayCode,
    questions: summary.questionCount,
    status: isScheduled ? "scheduled" : "live",
  } as const;
  const [sharing, setSharing] = useState(false);

  const loadCode = useCallback(async (): Promise<string> => {
    if (!state.serverQuizId) return displayCode;
    const fresh = await copyQuizCode(String(state.serverQuizId));
    const normalized = fresh.replace(/\s+/g, "");
    setCode(normalized);
    return normalized;
  }, [state.serverQuizId, displayCode]);

  const shareOnWhatsApp = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const currentCode = await loadCode();
      const message = buildShareMessage({ ...shareQuiz, code: currentCode }, "clean");
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error({
        title: "Could not open WhatsApp",
        description: getApiErrorMessage(err, "Please try again."),
      });
    } finally {
      setSharing(false);
    }
  };

  const copyInvite = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const currentCode = await loadCode();
      const message = buildShareMessage({ ...shareQuiz, code: currentCode }, "clean");
      await navigator.clipboard.writeText(message);
      toast.success({
        title: "Invite copied",
        description: "Quiz code and join link copied to clipboard.",
      });
    } catch (err) {
      toast.error({
        title: "Could not copy invite",
        description: getApiErrorMessage(err, "Please try again."),
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10 text-center">
        <div className="w-full">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-[var(--qs-ink)]">
            {isScheduled ? "Your quiz is scheduled." : "Your quiz is live."}
          </h2>
          <p className="mt-2 text-sm font-medium text-[var(--qs-muted)]">
            {isScheduled
              ? "It will open automatically at the scheduled time. Share the code or link with participants:"
              : "Share the code or link with participants:"}
          </p>

          <div className="mx-auto mt-5 max-w-md rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 py-4 shadow-[3px_3px_0_var(--qs-sun)]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-muted)]">
              Quiz code
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <code className="break-all text-lg font-extrabold tracking-[0.18em] text-[var(--qs-ink)]">
                {displayCode || "—"}
              </code>
              <button
                type="button"
                onClick={() => void copyInvite()}
                disabled={copying}
                className="shrink-0 rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-1.5 text-[var(--qs-muted)] transition-colors duration-150 hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] disabled:opacity-50"
                title="Copy quiz code and join link"
                aria-label="Copy quiz code and join link"
              >
                {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-2 truncate text-[11px] font-medium text-[var(--qs-muted)]">{link}</p>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-medium text-[var(--qs-muted)]">
            <span>{summary.questionCount} questions</span>
            <span>·</span>
            <span>{isScheduled ? "Scheduled" : "Live now"}</span>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <button
              type="button"
              onClick={() => void copyInvite()}
              disabled={copying}
              className="inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60"
            >
              {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Copy code & link
            </button>
            <button
              type="button"
              onClick={() => void shareOnWhatsApp()}
              disabled={sharing}
              className="inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[#128c4a] bg-[#25d366] px-4 py-2 text-sm font-extrabold text-[#06301a] transition-colors duration-150 hover:brightness-105 disabled:opacity-60"
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
              Send on WhatsApp
            </button>
            <button
              type="button"
              onClick={() => window.open(link, "_blank")}
              className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)]"
            >
              Open Quiz
            </button>
            {state.serverQuizId && (
              <a
                href={`/creator/quizzes/${state.serverQuizId}/responses`}
                className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-2 text-sm font-extrabold text-[#1a1240] transition-transform duration-150 hover:-translate-y-px active:translate-y-0"
              >
                <BarChart3 className="h-4 w-4" /> View Responses
              </a>
            )}
            <button
              type="button"
              onClick={onDashboard}
              className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)]"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
