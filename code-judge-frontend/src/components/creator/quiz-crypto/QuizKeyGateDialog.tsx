"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { normalizeKeyHex } from "@/lib/quizCrypto";
import { importQuizKeyHex } from "@/lib/quizKey";
import type { QuizKeyEntry } from "@/store/quizKeyStore";

interface QuizKeyGateDialogProps {
  open: boolean;
  title?: string | null;
  verify?: ((key: CryptoKey) => Promise<boolean>) | null;
  onComplete: (entry: QuizKeyEntry) => void;
  onCancel: () => void;
}

export function QuizKeyGateDialog({
  open,
  title,
  verify,
  onComplete,
  onCancel,
}: QuizKeyGateDialogProps) {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  const submit = async () => {
    if (busy) return;
    setError(null);
    let normalized: string;
    try {
      normalized = normalizeKeyHex(keyInput);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Enter the 64-character key from your PDF."
      );
      return;
    }

    setBusy(true);
    try {
      const entry = await importQuizKeyHex(normalized);
      if (verify && !(await verify(entry.key))) {
        setError("That key does not unlock this quiz. Check the PDF and try again.");
        return;
      }
      onComplete(entry);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not unlock the quiz. Check the key and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-[#1A1240]/70 p-3 backdrop-blur-[3px] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-key-gate-title"
          onClick={() => {
            if (!busy) onCancel();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-md overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[7px_7px_0_var(--qs-sun)]"
          >
            <div className="border-b-2 border-[var(--qs-line)] px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]">
                  <Lock className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="quiz-key-gate-title"
                    className="text-base font-black tracking-tight text-[var(--qs-ink)]"
                  >
                    Enter your teacher key
                  </h2>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                    Paste the key from the PDF you downloaded when saving
                    {title ? ` “${title}”` : " this quiz"}. It is checked in your
                    browser and is never uploaded.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  className="rounded-[8px] p-1 text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)] disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="block">
                <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                  Teacher key
                </span>
                <div className="relative">
                  <textarea
                    autoFocus
                    value={keyInput}
                    onChange={(event) => {
                      setKeyInput(event.target.value);
                      setError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                    rows={2}
                    spellCheck={false}
                    autoComplete="off"
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
                  >
                    {showKey ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </label>

              <p className="text-[10px] font-medium text-[var(--qs-muted)]">
                Spaces, dashes, colons and underscores are ignored.
                {keyInput.trim() && (
                  <span className="ml-1 font-bold text-[var(--qs-ink)]">
                    {keyInput.replace(/[\s\-_:]/g, "").length}/64 characters
                  </span>
                )}
              </p>

              {error && (
                <div className="flex gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                  <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-bad)]">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5">
                <KeyRound className="h-4 w-4 shrink-0 text-[var(--qs-muted)]" />
                <p className="text-[10px] font-medium leading-relaxed text-[var(--qs-muted)]">
                  The key is kept in this browser tab only. A refresh asks for it
                  again.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] px-5 py-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="rounded-[10px] px-3 py-2 text-xs font-bold text-[var(--qs-muted)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy || keyInput.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-xs font-black text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <KeyRound className="h-3.5 w-3.5" />
                )}
                {busy ? "Checking…" : "Unlock quiz"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
