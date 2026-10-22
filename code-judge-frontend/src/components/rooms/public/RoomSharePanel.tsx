"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  createRoomWithPassword,
  resetRoomPassword,
  type RoomCredentials,
} from "@/services/rooms";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import {
  buildRoomShareMessage,
  buildWhatsAppHref,
  copyText,
} from "@/utils/roomShare";
import { Reveal, Scramble, Typewriter } from "./roomMotion";
import styles from "./roomsCinematic.module.css";

const MIN_PASSWORD_LENGTH = 6;

/**
 * Teacher create/share screen. The plaintext password exists only in component
 * state immediately after create/reset; it is never re-fetched from the API.
 */
export default function RoomSharePanel({ animate = false }: { animate?: boolean }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [created, setCreated] = useState<RoomCredentials | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scrambleNonce, setScrambleNonce] = useState(0);

  const isTeacher = ["teacher", "admin"].includes((user?.role ?? "").toLowerCase());

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const message = buildRoomShareMessage({
    roomName: created?.name || name.trim() || "Your classroom",
    roomCode: created?.room_code || "------",
    password: created?.password || "••••••••",
  });
  const whatsappHref = buildWhatsAppHref(message);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give the room a name students will recognize.");
      return;
    }
    if (passwordInput && passwordInput.length < MIN_PASSWORD_LENGTH) {
      setError(`Custom passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setCreating(true);
    try {
      const credentials = await createRoomWithPassword({
        name: trimmedName,
        password: passwordInput || undefined,
      });
      setCreated(credentials);
      toast.success({ title: "Room created", description: "Share the code and password now — the password is not shown again." });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not create the room. Please try again."));
    } finally {
      setCreating(false);
    }
  }

  async function handleReset() {
    if (!created) return;
    setError(null);
    setResetting(true);
    setScrambleNonce((value) => value + 1);
    try {
      const credentials = await resetRoomPassword(created.room_code);
      setCreated(credentials);
      toast.success({ title: "Password reset", description: "Update the WhatsApp message with the new password." });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not reset the password. Please try again."));
    } finally {
      setResetting(false);
    }
  }

  async function handleCopy() {
    try {
      await copyText(message);
      setCopied(true);
      toast.success("Message copied");
    } catch {
      toast.error({ title: "Couldn't copy", description: "Select the preview text and copy it manually." });
    }
  }

  function handleCreateAnother() {
    setCreated(null);
    setName("");
    setPasswordInput("");
    setError(null);
  }

  if (!hasHydrated) {
    return (
      <div className="qs-card flex min-h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--qs-brand)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="qs-card mx-auto max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
          <LogIn className="h-6 w-6" />
        </div>
        <h2 className="qs-display mt-4 text-2xl text-[var(--qs-ink)]">Sign in to share a room</h2>
        <p className="mt-2 text-sm text-[var(--qs-muted)]">
          Only teacher accounts can create room codes and passwords.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent("/rooms?tab=teacher")}`}
          className="qs-btn mt-6 inline-flex min-h-12 px-6 text-sm"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!isTeacher) {
    return (
      <div className="qs-card mx-auto max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="qs-display mt-4 text-2xl text-[var(--qs-ink)]">Teacher account required</h2>
        <p className="mt-2 text-sm text-[var(--qs-muted)]">
          This screen creates shareable room credentials. Switch to the student tab to join a room instead.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(styles.shareStage, "mx-auto max-w-2xl")}>
      <span className={styles.offsetBlock} aria-hidden="true">
        <span className={cn(styles.offsetBlockClapper, animate && styles.offsetBlockAnimated)}>
          <span className={cn(styles.offsetBlockFill, styles.ambient)} />
        </span>
      </span>
      <div className={cn("qs-card", styles.shareCard, animate && styles.cardAnimated)}>
        <h2 className="qs-display text-3xl text-[var(--qs-ink)]">Share a room</h2>
        <p className="mt-1 text-sm text-[var(--qs-muted)]">
          Create a code and password, then send them on WhatsApp.
        </p>

        <form onSubmit={handleCreate} noValidate>
          <Reveal as="section" className="mt-6">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-sm font-extrabold text-[var(--qs-bg)]">1</span>
              <div>
                <h3 className="qs-display text-lg text-[var(--qs-ink)]">Name the room</h3>
                <p className="text-xs text-[var(--qs-muted)]">Students see this after they join.</p>
              </div>
            </div>
            <label htmlFor="share-room-name" className="mt-3 block text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Room name
            </label>
            <input
              id="share-room-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              maxLength={150}
              placeholder="Class 10 Maths"
              disabled={Boolean(created) || creating}
              className="mt-1.5 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-3 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60"
            />

            <label htmlFor="share-room-password" className="mt-4 block text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Password <span className="font-semibold normal-case tracking-normal">(optional)</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="share-room-password"
                type={showPasswordInput ? "text" : "password"}
                value={passwordInput}
                onChange={(event) => {
                  setPasswordInput(event.target.value);
                  setError(null);
                }}
                maxLength={128}
                placeholder="Leave blank to generate one"
                disabled={Boolean(created) || creating}
                autoComplete="new-password"
                className="w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-3 pr-16 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPasswordInput((visible) => !visible)}
                aria-label={showPasswordInput ? "Hide password" : "Show password"}
                className="absolute right-2 top-1.5 bottom-1.5 grid w-10 place-items-center rounded-lg text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-ink)]"
              >
                {showPasswordInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Reveal>

          <Reveal as="section" delay={100} className="mt-6 border-t-2 border-[var(--qs-line)] pt-5">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-sm font-extrabold text-[var(--qs-bg)]">2</span>
              <div>
                <h3 className="qs-display text-lg text-[var(--qs-ink)]">Code and password</h3>
                <p className="text-xs text-[var(--qs-muted)]">
                  {created ? "Shown once — save or share them now." : "Generated automatically when you create the room."}
                </p>
              </div>
            </div>

            <p className="mt-3 block text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Room code
            </p>
            <div className="mt-1.5 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 text-center font-mono text-xl font-extrabold uppercase tracking-[0.18em] text-[var(--qs-ink)]">
              <Scramble
                text={created?.room_code ?? ""}
                trigger={scrambleNonce}
                placeholder="------"
              />
            </div>

            <label className="mt-3 block text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]" htmlFor="share-room-created-password">
              Password
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="share-room-created-password"
                value={created?.password ?? ""}
                readOnly
                placeholder="••••••••"
                aria-label="Room password"
                className="w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 font-mono text-sm font-bold text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)]/50"
              />
              <button
                type="button"
                onClick={handleReset}
                disabled={!created || resetting}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                New
              </button>
            </div>
          </Reveal>

          {!created ? (
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="qs-btn mt-6 min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-45"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{creating ? "Creating…" : "Create room"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateAnother}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--qs-brand)] hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Create another room
            </button>
          )}

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-xs font-bold text-[var(--qs-bad)]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </form>

        <Reveal as="section" delay={200} className="mt-6 border-t-2 border-[var(--qs-line)] pt-5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-sm font-extrabold text-[var(--qs-bg)]">3</span>
            <div>
              <h3 className="qs-display text-lg text-[var(--qs-ink)]">Send to students</h3>
              <p className="text-xs text-[var(--qs-muted)]">This is the message they will get.</p>
            </div>
          </div>

          <Typewriter
            text={message}
            className="mt-3 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5 font-sans text-sm leading-relaxed text-[var(--qs-ink)]"
          />

          <div className="mt-3 grid gap-2.5">
            <a
              href={created ? whatsappHref : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!created}
              onClick={(event) => {
                if (!created) event.preventDefault();
              }}
              className={`qs-btn min-h-12 w-full text-base ${created ? "" : "pointer-events-none opacity-45"}`}
            >
              <Share2 className="h-4 w-4" />
              Share on WhatsApp
            </a>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!created}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {copied ? <Check className="h-4 w-4 text-[var(--qs-ok)]" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy message"}
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
