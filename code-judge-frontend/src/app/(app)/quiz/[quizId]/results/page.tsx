"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useQuizRegistrationStore } from "@/store/quizRegistrationStore";
import { getPreviousQuizzes } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

const LOOKUP_TIMEOUT_MS = 15000;

type Outcome =
  | { key: string; kind: "miss" }
  | { key: string; kind: "error"; message: string }
  | { key: string; kind: "redirect"; target: string }
  | null;

export default function QuizResultsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const registration = useQuizRegistrationStore((state) => state.getRegistration(code));
  const [retryKey, setRetryKey] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const valid = isValidQuizCode(code);
  // Fast path: attempt remembered on this device (localStorage). Derived
  // during render so no setState-in-effect is needed for the redirect.
  const fastTarget =
    valid && registration?.attemptId ? `/quiz/${code}/results/${registration.attemptId}` : null;
  const lookupKey = `${code}:${retryKey}`;

  useEffect(() => {
    if (fastTarget) router.replace(fastTarget);
  }, [fastTarget, router]);

  // Fallback: the device store is never populated by the attempt flow
  // (startAttempt/submitAttempt are not called anywhere), so resolve the
  // user's latest attempt for this quiz from the backend instead.
  //
  // StrictMode-safe: no once-ref guard — React 18+ double-invokes this
  // effect in dev (shared refs), so a `checkedRef` would swallow the second
  // (live) run after the first run's cleanup cancels its request, leaving
  // the loader spinning with no request in flight. The `cancelled` flag
  // alone is sufficient: the discarded run's response is ignored and the
  // surviving run completes normally. All setState calls live in async
  // callbacks, and results are keyed so stale responses can't leak across
  // retries or code changes.
  useEffect(() => {
    if (!valid || fastTarget) return;
    let cancelled = false;
    const key = lookupKey;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setOutcome({ key, kind: "error", message: "The request is taking too long. Check your connection and try again." });
      }
    }, LOOKUP_TIMEOUT_MS);
    getPreviousQuizzes({ limit: 50 })
      .then(({ quizzes }) => {
        if (cancelled) return;
        window.clearTimeout(timer);
        const match = (quizzes ?? []).find((quiz) => quiz.code === code);
        if (match) {
          const target = `/quiz/${code}/results/${match.attempt_id}`;
          setOutcome({ key, kind: "redirect", target });
          router.replace(target);
        } else {
          setOutcome({ key, kind: "miss" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(timer);
        setOutcome({ key, kind: "error", message: "Could not reach the server. Check your connection and try again." });
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [valid, fastTarget, code, router, lookupKey]);

  if (!valid) {
    return (
      <ResultState
        icon={<ShieldCheck className="h-8 w-8 text-text-muted" />}
        text="Invalid quiz code."
        action={<Link href="/quiz#activity" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white">View my activity</Link>}
      />
    );
  }

  // A match was found and navigation was requested — show a loader with a
  // manual fallback link in case the router transition ever stalls.
  const redirectTarget = fastTarget ?? (outcome && outcome.key === lookupKey && outcome.kind === "redirect" ? outcome.target : null);
  if (redirectTarget) {
    return (
      <ResultState
        icon={<Loader2 className="h-7 w-7 animate-spin text-pink-500" />}
        text="Loading your verified result…"
        action={
          <Link href={redirectTarget} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-text-primary">
            Continue to your result
          </Link>
        }
      />
    );
  }

  const active = outcome && outcome.key === lookupKey ? outcome : null;

  if (active?.kind === "error") {
    return (
      <ResultState
        icon={<ShieldCheck className="h-8 w-8 text-text-muted" />}
        text={active.message}
        action={
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white"
            >
              Retry
            </button>
            <Link href="/quiz#activity" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-text-primary">
              View my activity
            </Link>
          </div>
        }
      />
    );
  }

  if (active?.kind === "miss") {
    return (
      <ResultState
        icon={<ShieldCheck className="h-8 w-8 text-text-muted" />}
        text="No verified result was found for this quiz on this device."
        action={<Link href="/quiz#activity" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white">View my activity</Link>}
      />
    );
  }

  return <ResultState icon={<Loader2 className="h-7 w-7 animate-spin text-pink-500" />} text="Loading your verified result…" />;
}

function ResultState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        {icon}
        <p className="mt-3 text-sm leading-6 text-text-secondary">{text}</p>
        {action}
      </div>
    </div>
  );
}
