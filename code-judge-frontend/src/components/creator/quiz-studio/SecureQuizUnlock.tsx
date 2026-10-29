"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { QuestionHtml } from "@/components/creator/questions/QuestionHtml";
import { cn } from "@/lib/helpers";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  downloadKeyPdf,
  formatKeyHex,
  normalizeKeyHex,
  unlockQuiz,
  type SecureQuizPayload,
  type UnlockedQuiz,
} from "@/lib/quizCrypto";
import {
  getSecureQuizMeta,
  getSecureQuizPayload,
  type SecureQuizPayloadMeta,
} from "@/services/secureQuiz";
import { getQuizById, type QuizBasic } from "@/services/quiz";
import { useQuizCryptoStore } from "@/store/quizCryptoStore";
import { ClientEncryptedQuizPanel } from "./ClientEncryptedQuizPanel";

const TYPE_LABELS: Record<string, string> = {
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  true_false: "True / false",
  fill_blanks: "Fill in the blanks",
  integer: "Integer",
  text: "Short text",
  paragraph: "Paragraph",
  code_output: "Code output",
  match_following: "Match the following",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function hasHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;
  if (hasHtml(html)) {
    return <QuestionHtml html={html} className={className} />;
  }
  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[var(--qs-ink)]",
        className
      )}
    >
      {html}
    </p>
  );
}

function OptionRow({
  option,
  index,
  correctAnswer,
}: {
  option: unknown;
  index: number;
  correctAnswer: unknown;
}) {
  const record = isRecord(option) ? option : {};
  const id = asString(record.id);
  const contentHtml = asString(record.contentHtml);
  const content = asString(record.content);
  const explicitCorrect =
    typeof record.isCorrect === "boolean" ? record.isCorrect : undefined;
  const correctByAnswer = Array.isArray(correctAnswer)
    ? correctAnswer.map(String).includes(id)
    : correctAnswer !== undefined && correctAnswer !== null
      ? String(correctAnswer) === id ||
        (content.length > 0 && String(correctAnswer) === content)
      : false;
  const isCorrect = explicitCorrect ?? correctByAnswer;
  const label = asString(record.label) || String.fromCharCode(65 + index);

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border-2 px-3 py-2",
        isCorrect
          ? "border-[var(--qs-ok)]/50 bg-[var(--qs-okbg)]"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-extrabold",
          isCorrect
            ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white"
            : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
        )}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1">
        {contentHtml ? (
          <QuestionHtml html={contentHtml} />
        ) : (
          <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[var(--qs-ink)]">
            {content || "—"}
          </p>
        )}
      </div>
      {isCorrect && (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-ok)]" />
      )}
    </div>
  );
}

function DecryptedQuestion({
  question,
  index,
  problemHtml,
  fallbackHtml,
}: {
  question: unknown;
  index: number;
  problemHtml: string;
  fallbackHtml: string;
}) {
  const record = isRecord(question) ? question : {};
  const type = asString(record.type) || "single_choice";
  const marks = Number(record.marks ?? 0);
  const difficulty = asString(record.difficulty);
  const options = Array.isArray(record.options) ? record.options : [];
  const correctAnswer = record.correctAnswer;
  const explanation = asString(record.explanation);
  const hint = asString(record.hint);
  const html = problemHtml || fallbackHtml;
  const showPlainAnswer =
    options.length === 0 &&
    correctAnswer !== undefined &&
    correctAnswer !== null &&
    correctAnswer !== "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="overflow-hidden rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[10px] font-extrabold text-[var(--qs-bg)]">
            {index + 1}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
            {TYPE_LABELS[type] ?? type}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--qs-muted)]">
          {difficulty && (
            <span className="rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-0.5">
              {difficulty}
            </span>
          )}
          <span className="rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-0.5">
            {marks > 0 ? `${marks} marks` : "No marks"}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <RichContent html={html} />

        {options.length > 0 && (
          <div className="space-y-1.5">
            {options.map((option, optionIndex) => (
              <OptionRow
                key={isRecord(option) && option.id != null ? String(option.id) : optionIndex}
                option={option}
                index={optionIndex}
                correctAnswer={correctAnswer}
              />
            ))}
          </div>
        )}

        {showPlainAnswer && (
          <div className="rounded-[10px] border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] px-3 py-2">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
              Correct answer
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-[13px] font-bold text-[var(--qs-ink)]">
              {Array.isArray(correctAnswer)
                ? correctAnswer.join(", ")
                : String(correctAnswer)}
            </p>
          </div>
        )}

        {type === "match_following" &&
          Array.isArray(record.matchItems) &&
          Array.isArray(record.matchMatches) && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5">
                <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  Column A
                </p>
                {record.matchItems.map((item, itemIndex) => (
                  <p
                    key={itemIndex}
                    className="border-b border-[var(--qs-line)] py-1 text-[12px] font-medium text-[var(--qs-ink)] last:border-b-0"
                  >
                    {isRecord(item) ? asString(item.content) || "—" : "—"}
                  </p>
                ))}
              </div>
              <div className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5">
                <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  Column B
                </p>
                {record.matchMatches.map((item, itemIndex) => (
                  <p
                    key={itemIndex}
                    className="border-b border-[var(--qs-line)] py-1 text-[12px] font-medium text-[var(--qs-ink)] last:border-b-0"
                  >
                    {isRecord(item) ? asString(item.content) || "—" : "—"}
                  </p>
                ))}
              </div>
            </div>
          )}

        {(hint || explanation) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {hint && (
              <div className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  Hint
                </p>
                <RichContent html={hint} className="text-[12px]" />
              </div>
            )}
            {explanation && (
              <div className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  Explanation
                </p>
                <RichContent html={explanation} className="text-[12px]" />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

function SecureQuizUnlockV1({ quizId }: { quizId: string }) {
  const [meta, setMeta] = useState<SecureQuizPayloadMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SecureQuizPayload | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [unlocked, setUnlocked] = useState<UnlockedQuiz | null>(null);
  const [unlockedKey, setUnlockedKey] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [redownloading, setRedownloading] = useState(false);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const next = await getSecureQuizMeta(quizId);
      setMeta(next);
    } catch (err) {
      setMetaError(
        getApiErrorMessage(
          err,
          "Could not load the encrypted copy metadata. Please try again."
        )
      );
    } finally {
      setMetaLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    // The loading flags are already true on mount; deferring the fetch keeps
    // the effect body free of synchronous state updates.
    queueMicrotask(() => {
      void loadMeta();
    });
  }, [loadMeta]);

  const handleUnlock = async () => {
    if (unlocking) return;
    setUnlockError(null);
    let normalized: string;
    try {
      normalized = normalizeKeyHex(keyInput);
    } catch (err) {
      setUnlockError(
        err instanceof Error
          ? err.message
          : "Enter the 64-character key from your PDF."
      );
      return;
    }

    setUnlocking(true);
    try {
      const nextPayload = payload ?? (await getSecureQuizPayload(quizId));
      setPayload(nextPayload);
      const opened = await unlockQuiz(nextPayload, normalized);
      setUnlocked(opened);
      setUnlockedKey(normalized);
      useQuizCryptoStore.getState().setKey(quizId, {
        keyHex: normalized,
        keyFingerprint: opened.keyFingerprint,
      });
    } catch (err) {
      setUnlockError(
        err instanceof Error
          ? err.message
          : "Could not unlock the quiz. Check the key and try again."
      );
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    setUnlocked(null);
    setUnlockedKey(null);
    setKeyInput("");
    setUnlockError(null);
  };

  const handleRedownload = async () => {
    if (!unlocked || !unlockedKey || !payload || redownloading) return;
    setRedownloading(true);
    try {
      await downloadKeyPdf(unlockedKey, payload.quizId, unlocked.title, {
        serverQuizId: quizId,
      });
    } catch {
      setUnlockError("Could not generate the key PDF. Please try again.");
    } finally {
      setRedownloading(false);
    }
  };

  const questionCount = useMemo(
    () => (unlocked ? unlocked.questions.length : 0),
    [unlocked]
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 py-3 sm:space-y-6 sm:px-4 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 sm:px-0">
        <div>
          <Link
            href="/creator/quizzes"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to my quizzes
          </Link>
          <h1 className="mt-1.5 flex items-center gap-2 text-lg font-black tracking-tight text-[var(--qs-ink)] sm:text-xl">
            <ShieldCheck className="h-5 w-5 text-[var(--qs-ok)]" />
            Encrypted quiz copy
          </h1>
        </div>
        <Link
          href={`/creator/quizzes/${encodeURIComponent(quizId)}/edit?step=reviewPublish`}
          className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          Back to quiz editor
        </Link>
      </div>

      {metaLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--qs-muted)]">
            <SecureLogo
              variant="mark"
              size={20}
              className="animate-pulse motion-reduce:animate-none"
            />
            Checking for an encrypted copy…
          </div>
        </div>
      ) : metaError ? (
        <div className="rounded-[18px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--qs-bad)]" />
            <div>
              <p className="text-sm font-extrabold text-[var(--qs-bad)]">
                Could not load the encrypted copy
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-ink)]">
                {metaError}
              </p>
              <button
                type="button"
                onClick={() => void loadMeta()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-bad)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-extrabold text-[var(--qs-bad)]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        </div>
      ) : !meta?.exists ? (
        <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-black text-[var(--qs-ink)]">
            No encrypted copy yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            Open the quiz editor and press Save or Publish. The browser will
            encrypt the questions, download a key PDF, and upload only the
            ciphertext.
          </p>
          <Link
            href={`/creator/quizzes/${encodeURIComponent(quizId)}/edit`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
          >
            Open quiz editor
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3 text-[10px] font-bold text-[var(--qs-muted)]">
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="h-3.5 w-3.5" /> AES-256-GCM
            </span>
            <span className="text-[var(--qs-line)]">|</span>
            <span>2 encrypted blobs (questions + problem HTML)</span>
            {meta.updatedAt && (
              <>
                <span className="text-[var(--qs-line)]">|</span>
                <span>Updated {new Date(meta.updatedAt).toLocaleString()}</span>
              </>
            )}
          </div>

          {meta.stale && (
            <div className="flex gap-2.5 rounded-[12px] border-2 border-[var(--qs-warn)]/50 bg-[var(--qs-warnbg)] px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-warn)]" />
              <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-ink)]">
                Questions changed after this encrypted copy was saved. Re-save
                from the quiz editor to create a new encrypted copy and key PDF.
              </p>
            </div>
          )}

          {!unlocked ? (
            <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
              <div className="border-b-2 border-[var(--qs-line)] px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
                  <KeyRound className="h-4 w-4" /> Enter your teacher key
                </h2>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
                  Paste the key from the PDF you downloaded when saving. It is
                  checked here in your browser and is never uploaded.
                </p>
              </div>
              <div className="space-y-3 px-5 py-4">
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  Key
                </label>
                <div className="relative">
                  <textarea
                    value={keyInput}
                    onChange={(event) => {
                      setKeyInput(event.target.value);
                      setUnlockError(null);
                    }}
                    rows={2}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx"
                    className={cn(
                      "w-full resize-none rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 pr-11 font-mono text-[13px] font-bold text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)]/50 focus:border-[var(--qs-brand)]",
                      showKey && "text-[var(--qs-ink)]",
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
                    {showKey ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] font-medium text-[var(--qs-muted)]">
                  Spaces, dashes, colons and underscores are ignored.
                  {keyInput.trim() && (
                    <span className="ml-1 font-bold text-[var(--qs-ink)]">
                      {keyInput.replace(/[\s\-_:]/g, "").length}/64 characters
                    </span>
                  )}
                </p>

                {unlockError && (
                  <div className="flex gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                    <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-bad)]">
                      {unlockError}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleUnlock()}
                  disabled={unlocking || keyInput.trim().length === 0}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {unlocking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Decrypting in
                      your browser…
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" /> Unlock quiz
                    </>
                  )}
                </button>
                <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-[var(--qs-muted)]">
                  <Lock className="h-3 w-3" /> The key stays in this tab. It is
                  cleared when you lock or leave the page.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white">
                    <Unlock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-[var(--qs-ink)]">
                      {unlocked.title || "Encrypted quiz"}
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-[var(--qs-ok)]">
                      Decrypted in this browser · {questionCount}{" "}
                      {questionCount === 1 ? "question" : "questions"}
                    </p>
                    <p className="mt-1 break-all font-mono text-[9px] text-[var(--qs-muted)]">
                      Key fingerprint: {formatKeyHex(unlocked.keyFingerprint)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRedownload()}
                    disabled={redownloading}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-60"
                  >
                    {redownloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Key PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleLock}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] px-3 py-1.5 text-[11px] font-extrabold text-[var(--qs-bg)]"
                  >
                    <Lock className="h-3.5 w-3.5" /> Lock
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-muted)]" />
                <p className="text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
                  Read-only preview. Edits still happen in the quiz editor; save
                  again from there to create a new encrypted copy and a new key
                  PDF.
                </p>
              </div>

              <div className="space-y-3">
                {unlocked.questions.map((question, index) => {
                  const record = isRecord(question) ? question : {};
                  const id =
                    typeof record.id === "string" && record.id.length > 0
                      ? record.id
                      : String(index);
                  return (
                    <DecryptedQuestion
                      key={id}
                      question={question}
                      index={index}
                      problemHtml={unlocked.problemHtml[id] ?? ""}
                      fallbackHtml={asString(record.title)}
                    />
                  );
                })}
                {unlocked.questions.length === 0 && (
                  <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-10 text-center text-sm font-bold text-[var(--qs-muted)]">
                    This encrypted copy has no questions.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SecureQuizUnlock({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getQuizById(quizId)
      .then((loaded) => {
        if (!cancelled) setQuiz(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            getApiErrorMessage(err, "Could not load this quiz. Please try again.")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId, reloadKey]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--qs-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading encrypted quiz…
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="rounded-[18px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--qs-bad)]" />
            <div>
              <p className="text-sm font-extrabold text-[var(--qs-bad)]">
                Could not open the encrypted quiz
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-ink)]">
                {error ?? "Quiz not found."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setReloadKey((value) => value + 1);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-bad)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-extrabold text-[var(--qs-bad)]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (Number(quiz.crypto_version) === 1) {
    return <ClientEncryptedQuizPanel quiz={quiz} />;
  }

  return <SecureQuizUnlockV1 quizId={quizId} />;
}
