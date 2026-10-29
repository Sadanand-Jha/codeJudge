"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  downloadKeyPdf,
  formatKeyHex,
  type PreparedQuiz,
} from "@/lib/quizCrypto";
import { saveSecureQuizPayload } from "@/services/secureQuiz";
import { getApiErrorMessage } from "@/lib/apiError";

export interface SecureQuizKeyDialogProps {
  open: boolean;
  quizId: string;
  quizCode?: string;
  title: string;
  keyHex: string;
  keyFingerprint: string;
  /** Encrypts the questions in the browser; runs only after the user confirms. */
  preparePayload: () => Promise<PreparedQuiz>;
  /** True when an older encrypted copy will be replaced by this one. */
  replacing: boolean;
  onCompleted: (result: {
    fileName: string;
    keyFingerprint: string;
  }) => void;
  onCancel: () => void;
}

export function SecureQuizKeyDialog({
  open,
  quizId,
  quizCode,
  title,
  keyHex,
  keyFingerprint,
  preparePayload,
  replacing,
  onCompleted,
  onCancel,
}: SecureQuizKeyDialogProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [downloadedFileName, setDownloadedFileName] = useState<string | null>(
    null
  );
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formattedKey = useMemo(() => formatKeyHex(keyHex), [keyHex]);
  const busy = downloading || uploading;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(formattedKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the key. Select it manually and copy.");
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setDownloading(true);
    setError(null);
    try {
      const result = await downloadKeyPdf(keyHex, quizId, title, {
        quizCode,
        serverQuizId: quizId,
        keyFingerprint,
      });
      setDownloadedFileName(result.fileName);
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

  const handleSubmit = async () => {
    if (busy) return;
    if (!downloaded) {
      setError("Download the key PDF before saving the encrypted copy.");
      return;
    }
    if (!confirmed) {
      setError("Confirm that you have saved the key PDF.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const prepared = await preparePayload();
      await saveSecureQuizPayload(quizId, prepared.payload);
      onCompleted({
        fileName:
          downloadedFileName ?? `quizsupport-encrypted-key-${quizId}.pdf`,
        keyFingerprint: prepared.keyFingerprint,
      });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Could not upload the encrypted copy. Your questions were not uploaded."
        )
      );
    } finally {
      setUploading(false);
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
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#1A1240]/70 p-3 backdrop-blur-[3px] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="secure-quiz-key-title"
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
            className="my-auto w-full max-w-lg overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[7px_7px_0_var(--qs-sun)]"
          >
            {/* Header */}
            <div className="border-b-2 border-[var(--qs-line)] px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="secure-quiz-key-title"
                    className="text-base font-black tracking-tight text-[var(--qs-ink)]"
                  >
                    Download your quiz key
                  </h2>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                    Your questions are encrypted in this browser when you press
                    Done. Download the key PDF first — only the encrypted
                    questions and options are sent to the backend.
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-5 py-5 sm:px-6">
              {replacing && (
                <div className="mb-4 flex gap-2.5 rounded-[12px] border-2 border-[var(--qs-warn)]/50 bg-[var(--qs-warnbg)] px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-warn)]" />
                  <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-ink)]">
                    An encrypted copy already exists. Continuing replaces it
                    with a new key. The previous PDF will stop working.
                  </p>
                </div>
              )}

              {/* Key block */}
              <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                    <KeyRound className="h-3.5 w-3.5" />
                    Teacher key
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyKey()}
                    disabled={busy}
                    className="inline-flex h-7 items-center gap-1 rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-[10px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50"
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
                  Fingerprint: {keyFingerprint}
                </p>
                <p className="mt-2 text-[10px] font-medium leading-relaxed text-[var(--qs-muted)]">
                  Also included as a QR code in the PDF. Spaces and dashes are
                  ignored when you paste it later.
                </p>
              </div>

              {/* Download */}
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={busy}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border-2 px-4 py-3 text-sm font-extrabold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-60",
                  downloaded
                    ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)] shadow-none"
                    : "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
                )}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating
                    PDF…
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
              {downloaded && (
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={busy}
                  className="mt-2 w-full text-center text-[10px] font-bold text-[var(--qs-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--qs-ink)] disabled:opacity-50"
                >
                  Download again
                </button>
              )}

              {/* Confirmation */}
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => {
                    setConfirmed(event.target.checked);
                    setError(null);
                  }}
                  disabled={busy}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--qs-brand)]"
                />
                <span className="text-[11px] font-semibold leading-relaxed text-[var(--qs-ink)]">
                  I have saved the key PDF. I understand QuizSupport cannot
                  recover this key, and without it the encrypted questions
                  cannot be opened.
                </span>
              </label>

              {error && (
                <div className="mt-3 flex gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                  <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-bad)]">
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse items-stretch gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={onCancel}
                disabled={uploading}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busy || !downloaded || !confirmed}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-4 text-xs font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading
                    encrypted copy…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" /> Done — encrypt & save
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
