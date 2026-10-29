"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { cn } from "@/lib/helpers";
import { normalizeKeyHex } from "@/lib/quizCrypto";

export interface QuizKeyGateProps {
  quizTitle?: string;
  subtitle?: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (keyHex: string) => Promise<void> | void;
  className?: string;
}

/**
 * Shared key entry surface for encrypted quiz copies. The parent owns the
 * payload fetch and decryption; this component only collects and normalizes
 * the teacher key. Nothing is persisted — a refresh always asks again.
 */
export default function QuizKeyGate({
  quizTitle,
  subtitle = "Paste the teacher key from the encrypted quiz PDF to unlock the questions and options in this browser.",
  busy = false,
  error,
  onSubmit,
  className,
}: QuizKeyGateProps) {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const displayError = localError ?? error ?? null;
  const normalizedLength = keyInput.replace(/[\s\-_:]/g, "").length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || submitting) return;
    setLocalError(null);
    let normalized: string;
    try {
      normalized = normalizeKeyHex(keyInput);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Enter the 64-character key from the PDF."
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(normalized);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Could not unlock the quiz. Check the key and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = busy || submitting;

  return (
    <div
      className={cn(
        "qs-ui flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-[var(--qs-bg)] px-4 py-10 text-[var(--qs-ink)]",
        className
      )}
    >
      <div className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-center gap-2">
          <SecureLogo variant="mark" size={30} />
          <span className="text-lg font-black tracking-tight">
            Quiz<span className="text-[var(--qs-brand)]">Support</span>
          </span>
        </div>
        <div className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[5px_5px_0_var(--qs-sun)]">
          <div className="border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-5 sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-brand)]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-brand)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Encrypted quiz
            </span>
            <h1 className="mt-3 flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
              <KeyRound className="h-5 w-5 text-[var(--qs-brand)]" />
              {quizTitle?.trim() || "Enter the quiz key"}
            </h1>
            <p className="mt-1.5 text-xs font-medium leading-relaxed text-[var(--qs-muted)] sm:text-sm">
              {subtitle}
            </p>
          </div>

          <form className="space-y-4 px-5 py-5 sm:px-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="quiz-key"
                className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]"
              >
                Teacher key
              </label>
              <div className="relative">
                <textarea
                  id="quiz-key"
                  value={keyInput}
                  onChange={(event) => {
                    setKeyInput(event.target.value);
                    setLocalError(null);
                  }}
                  rows={2}
                  spellCheck={false}
                  autoComplete="off"
                  autoFocus
                  placeholder="xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx"
                  className={cn(
                    "w-full resize-none rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 pr-11 font-mono text-[13px] font-bold text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)]/50 focus:border-[var(--qs-brand)]",
                    !showKey && "[-webkit-text-security:disc]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="absolute right-2 top-2 rounded-[8px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-1.5 text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)]"
                  aria-label={showKey ? "Hide key" : "Show key"}
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] font-medium text-[var(--qs-muted)]">
                Spaces, dashes, colons and underscores are ignored.
                {normalizedLength > 0 && (
                  <span className="ml-1 font-bold text-[var(--qs-ink)]">
                    {normalizedLength}/64 characters
                  </span>
                )}
              </p>
            </div>

            {displayError && (
              <div className="flex gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-bad)]">
                  {displayError}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy || keyInput.trim().length === 0}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Decrypting in your browser…
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" /> Unlock quiz
                </>
              )}
            </button>
            <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-[var(--qs-muted)]">
              <Lock className="h-3 w-3" /> The key stays in this tab and is cleared on refresh.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
