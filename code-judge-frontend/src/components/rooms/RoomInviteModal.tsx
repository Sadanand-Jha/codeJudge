"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AudienceModal from "@/components/quiz/creator/settings/audience/AudienceModal";
import { WhatsAppIcon } from "@/components/creator/common/ShareQuizDialog";
import { useAuthStore } from "@/store/authStore";
import {
  getRoomSummary,
  resetRoomPassword,
  type RoomCredentials,
  type RoomSummary,
} from "@/services/rooms";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import {
  buildRoomJoinLink,
  buildRoomShareMessage,
  buildWhatsAppHref,
  copyText,
} from "@/utils/roomShare";
import {
  DEFAULT_PASSWORD_EXPIRY_MINUTES,
  PASSWORD_EXPIRY_OPTIONS,
  formatPasswordExpiry,
  formatPasswordExpiryRelative,
} from "@/utils/passwordExpiry";

interface RoomInviteModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  onEditForm?: () => void;
}

const inputCls =
  "w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

export default function RoomInviteModal({
  open,
  onClose,
  roomId,
  roomName,
  onEditForm,
}: RoomInviteModalProps) {
  const creatorUsername = useAuthStore((state) => state.user?.username);
  const [summary, setSummary] = useState<RoomSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState<number | null>(
    DEFAULT_PASSWORD_EXPIRY_MINUTES
  );
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"message" | "link" | null>(null);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) {
        setLoading(true);
        setError(null);
      }
    });

    getRoomSummary(roomId)
      .then((result) => {
        if (!disposed) setSummary(result);
      })
      .catch((loadError: unknown) => {
        if (!disposed) {
          setError(getApiErrorMessage(loadError, "Could not load this room."));
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [open, roomId]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const roomCode = summary?.room_code || "";
  const joinLink = credentials
    ? buildRoomJoinLink({ roomCode, password: credentials.password })
    : "";
  const message = credentials
    ? buildRoomShareMessage({
        roomName: roomName || credentials.name,
        roomCode,
        password: credentials.password,
        creatorUsername,
        passwordExpiresAt: credentials.password_expires_at,
      })
    : "";
  const whatsappHref = message ? buildWhatsAppHref(message) : undefined;
  const registrationForm = summary?.registration_form;
  const registrationFieldCount = registrationForm?.fields.length ?? 0;

  async function handleGenerate() {
    if (!roomCode) return;
    setError(null);
    setGenerating(true);
    setShowPassword(false);
    try {
      const result = await resetRoomPassword(roomCode, {
        expires_in_minutes: expiryMinutes,
      });
      setCredentials(result);
      toast.success({
        title: "Invite ready",
        description: "The old password stops working as soon as you share this one.",
      });
    } catch (generateError: unknown) {
      const nextError = getApiErrorMessage(
        generateError,
        "Could not create a new password. Please try again."
      );
      setError(nextError);
      toast.error({ title: "Could not create invite", description: nextError });
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(kind: "message" | "link") {
    const value = kind === "message" ? message : joinLink;
    if (!value) return;
    try {
      await copyText(value);
      setCopied(kind);
      toast.success(kind === "message" ? "Message copied" : "Join link copied");
    } catch {
      toast.error({ title: "Couldn't copy", description: "Select and copy manually." });
    }
  }

  return (
    <AudienceModal
      open={open}
      onClose={onClose}
      title="Invite students on WhatsApp"
      subtitle={`Send a one-tap join link for ${roomName}. The room code stays the same; only the password expires.`}
      icon={<WhatsAppIcon className="h-5 w-5" />}
      size="lg"
    >
      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--qs-brand)]" />
        </div>
      ) : (
        <div className="space-y-5">
          {error ? (
            <p className="flex items-start gap-2 rounded-[14px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3.5 py-3 text-xs font-bold text-[var(--qs-bad)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          {summary ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                    Room code
                  </p>
                  <p className="mt-0.5 font-mono text-xl font-extrabold uppercase tracking-[0.16em] text-[var(--qs-ink)]">
                    {summary.room_code}
                  </p>
                  {creatorUsername ? (
                    <p className="mt-0.5 text-[11px] font-bold text-[var(--qs-muted)]">
                      Teacher: @{creatorUsername.replace(/^@+/, "")}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                  <ShieldCheck className="h-3 w-3" />
                  Code never expires
                </span>
              </div>

              <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                  Current password
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--qs-ink)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                  {summary.password_expires_at
                    ? `Expires ${formatPasswordExpiry(summary.password_expires_at)}`
                    : "Does not expire"}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
                  The plaintext is stored only once. Generate a fresh password to copy and
                  share it; the old one will stop working.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!credentials ? (
                  <motion.div
                    key="setup"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                  >
                    <label
                      htmlFor="invite-expiry"
                      className="block text-xs font-extrabold text-[var(--qs-ink)]"
                    >
                      New password expires after
                    </label>
                    <select
                      id="invite-expiry"
                      value={expiryMinutes === null ? "never" : String(expiryMinutes)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setExpiryMinutes(value === "never" ? null : Number(value));
                        setError(null);
                      }}
                      className={cn(inputCls, "mt-1.5")}
                    >
                      {PASSWORD_EXPIRY_OPTIONS.map((option) => (
                        <option
                          key={option.label}
                          value={option.minutes === null ? "never" : String(option.minutes)}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] font-medium text-[var(--qs-muted)]">
                      Times are shown in your timezone.
                    </p>

                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="qs-btn mt-4 min-h-12 w-full text-base"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {generating ? "Creating link…" : "Create WhatsApp invite"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0, y: 14, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    <div className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[5px_5px_0_var(--qs-sun)]">
                      <div className="flex items-center gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-4 py-2.5">
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 320, damping: 18 }}
                          className="grid h-5 w-5 place-items-center rounded-full bg-[var(--qs-ok)] text-white"
                        >
                          <Check className="h-3 w-3" />
                        </motion.span>
                        <p className="text-xs font-extrabold text-[var(--qs-ink)]">
                          Invite ready to share
                        </p>
                      </div>

                      <div className="grid gap-3 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                            Room code
                          </p>
                          <p className="mt-1 font-mono text-lg font-extrabold uppercase tracking-[0.14em] text-[var(--qs-ink)]">
                            {roomCode}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                            Password
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate font-mono text-lg font-extrabold text-[var(--qs-ink)]">
                              {showPassword ? credentials.password : "•".repeat(8)}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowPassword((visible) => !visible)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-ink)]"
                            >
                              {showPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mx-4 mb-4 flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
                        <div>
                          <p className="text-[11px] font-extrabold text-[var(--qs-ink)]">
                            {formatPasswordExpiry(credentials.password_expires_at)}
                          </p>
                          <p className="text-[10px] font-semibold text-[var(--qs-muted)]">
                            {formatPasswordExpiryRelative(credentials.password_expires_at)} · room code never expires
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                          Join link
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="min-w-0 flex-1 truncate rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-2 font-mono text-[11px] font-semibold text-[var(--qs-ink)]">
                            {joinLink}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy("link")}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                          >
                            {copied === "link" ? (
                              <Check className="h-3.5 w-3.5 text-[var(--qs-ok)]" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[#0b3d2c] bg-[#25D366] px-4 text-sm font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
                    >
                      <WhatsAppIcon className="h-4.5 w-4.5" />
                      Share on WhatsApp
                    </a>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy("message")}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                      >
                        {copied === "message" ? (
                          <Check className="h-3.5 w-3.5 text-[var(--qs-ok)]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copy message
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50"
                      >
                        {generating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        New password
                      </button>
                    </div>

                    <details className="mt-3 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                      <summary className="cursor-pointer text-[11px] font-extrabold text-[var(--qs-ink)]">
                        Preview WhatsApp message
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[11px] font-medium leading-relaxed text-[var(--qs-ink)]">
                        {message}
                      </pre>
                    </details>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                      <ClipboardList className="h-3 w-3" />
                      Registration form
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-[var(--qs-ink)]">
                      {registrationFieldCount > 0
                        ? `${registrationForm?.title || "Student registration"} · ${registrationFieldCount} field${registrationFieldCount !== 1 ? "s" : ""}`
                        : "Not configured — students join with code + password"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditForm?.();
                    }}
                    className="inline-flex h-8 items-center justify-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11px] font-extrabold text-[var(--qs-brand)] transition-colors hover:border-[var(--qs-brand)]"
                  >
                    {registrationFieldCount > 0 ? "Edit form" : "Add form"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </AudienceModal>
  );
}
