"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { downloadKeyPdf, formatKeyHex } from "@/lib/quizCrypto";
import { useQuizKeyDialogStore } from "@/store/quizKeyDialogStore";

export function QuizKeyDialog() {
  const open = useQuizKeyDialogStore((state) => state.open);
  const payload = useQuizKeyDialogStore((state) => state.payload);
  const close = useQuizKeyDialogStore((state) => state.close);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedKey = useMemo(
    () => (payload ? formatKeyHex(payload.keyHex) : ""),
    [payload]
  );

  const copyKey = async () => {
    if (!formattedKey) return;
    try {
      await navigator.clipboard.writeText(formattedKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the key. Select it manually and copy.");
    }
  };

  const handleDownload = async () => {
    if (!payload || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadKeyPdf(payload.keyHex, payload.quizId, payload.title, {
        serverQuizId: payload.quizId,
        keyFingerprint: payload.keyFingerprint,
        generatedAt: new Date(),
      });
      setDownloaded(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the key PDF. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleClose = () => {
    if (!downloaded) return;
    setDownloaded(false);
    setError(null);
    close();
  };

  return (
    <AnimatePresence>
      {open && payload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[125] flex items-center justify-center overflow-y-auto bg-[#1A1240]/70 p-3 backdrop-blur-[3px] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-key-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="my-auto w-full max-w-lg overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[7px_7px_0_var(--qs-sun)]"
          >
            <div className="border-b-2 border-[var(--qs-line)] px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="quiz-key-dialog-title"
                    className="text-base font-black tracking-tight text-[var(--qs-ink)]"
                  >
                    Download your quiz key
                  </h2>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                    A new key was created for this quiz. Download the PDF now —
                    it is the only way to open these encrypted questions later.
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                    <KeyRound className="h-3.5 w-3.5" />
                    Teacher key
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyKey()}
                    className="inline-flex h-7 items-center gap-1 rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-[10px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 break-all font-mono text-[13px] font-bold leading-relaxed text-[var(--qs-ink)] sm:text-sm">
                  {formattedKey}
                </p>
                <p className="mt-2 break-all font-mono text-[9px] leading-relaxed text-[var(--qs-muted)]">
                  Fingerprint: {payload.keyFingerprint}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border-2 px-4 py-3 text-sm font-extrabold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60",
                  downloaded
                    ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)] shadow-none"
                    : "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
                )}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…
                  </>
                ) : downloaded ? (
                  <>
                    <Check className="h-4 w-4" /> Key PDF downloaded
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Download key PDF
                  </>
                )}
              </button>

              {error && (
                <div className="mt-3 flex gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                  <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-bad)]">
                    {error}
                  </p>
                </div>
              )}

              <div className="mt-3 flex gap-2.5 rounded-[12px] border-2 border-[var(--qs-warn)]/50 bg-[var(--qs-warnbg)] px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-warn)]" />
                <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-ink)]">
                  The key is kept only in this browser tab. If you refresh
                  without the PDF, the encrypted questions cannot be opened
                  again.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] px-5 py-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={!downloaded}
                className="inline-flex items-center gap-2 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-xs font-black text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
