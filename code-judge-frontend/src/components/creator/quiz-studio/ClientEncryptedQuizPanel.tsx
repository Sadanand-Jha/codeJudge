"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { KekGateHost } from "@/components/creator/quiz-crypto/KekGateHost";
import { getApiErrorMessage } from "@/lib/apiError";
import { requireKek } from "@/lib/quizKek";
import { buildSecureShareLink, exportShareDek } from "@/lib/quizCryptoV2";
import { KekGateCancelledError } from "@/store/kekGateStore";
import { getTeacherSecureContent } from "@/services/quizCrypto";
import type { QuizBasic } from "@/services/quiz";
import { toast } from "@/lib/toast";

export function ClientEncryptedQuizPanel({ quiz }: { quiz: QuizBasic }) {
  const [link, setLink] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLink = async () => {
    if (unlocking) return;
    setUnlocking(true);
    setError(null);
    try {
      const kek = await requireKek();
      const content = await getTeacherSecureContent(quiz.id);
      if (!content.configured || !content.wrappedDek) {
        setError(
          "No encrypted copy exists yet. Save the quiz from the editor to create one."
        );
        return;
      }
      const dek = await exportShareDek(String(quiz.id), kek, content.wrappedDek);
      setLink(buildSecureShareLink(quiz.code, dek));
    } catch (err) {
      if (err instanceof KekGateCancelledError) return;
      setError(
        getApiErrorMessage(err, "Could not create the secure link. Please try again.")
      );
    } finally {
      setUnlocking(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success({
        title: "Secure link copied",
        description: "Send it only to students who should see this quiz.",
      });
    } catch {
      toast.error({
        title: "Could not copy the link",
        description: "Select the link and copy it manually.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-3 sm:px-4 sm:py-6">
      <KekGateHost />
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
            Secure quiz link
          </h1>
        </div>
        <Link
          href={`/creator/quizzes/${encodeURIComponent(String(quiz.id))}/edit`}
          className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          Back to quiz editor
        </Link>
      </div>

      <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
        <div className="border-b-2 border-[var(--qs-line)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
            <LockKeyhole className="h-4 w-4" /> Browser-end encrypted
          </h2>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
            Questions and options are encrypted in this browser. The secure link
            carries the quiz decryption key in its fragment, which is never sent
            to the server.
          </p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-[var(--qs-muted)]">
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="h-3.5 w-3.5" /> AES-256-GCM
            </span>
            <span className="text-[var(--qs-line)]">|</span>
            <span>One DEK per quiz</span>
            <span className="text-[var(--qs-line)]">|</span>
            <span>Quiz code {quiz.code}</span>
          </div>

          {link ? (
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Student link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={link}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 font-mono text-[11px] font-bold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                />
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <p className="flex items-start gap-1.5 text-[10px] font-semibold leading-relaxed text-[var(--qs-warn)]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Anyone with this link can read the quiz. Send it only through a
                channel you trust.
              </p>
              <a
                href={link}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--qs-brand)] underline-offset-2 hover:underline"
              >
                <Link2 className="h-3.5 w-3.5" /> Open secure link
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void createLink()}
              disabled={unlocking}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {unlocking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Unlocking in this
                  browser…
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" /> Unlock and create link
                </>
              )}
            </button>
          )}

          {error && (
            <div className="flex gap-2 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
              <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-bad)]">
                {error}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-muted)]" />
            <p className="text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
              Your teacher key unlocks the quiz only in this tab. It is never
              uploaded. Re-save the quiz from the editor to refresh the
              encrypted copy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
