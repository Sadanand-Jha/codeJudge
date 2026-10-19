"use client";

import { useEffect } from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="qs-ui flex min-h-screen items-center justify-center bg-[var(--qs-bg)] px-4 py-10">
      <div className="w-full max-w-md rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 text-center shadow-[6px_6px_0_var(--qs-sun)] sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-badbg)]">
          <AlertTriangle className="h-6 w-6 text-[var(--qs-bad)]" />
        </div>
        <p className="inline-flex items-center rounded-full border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--qs-bad)]">
          Something went wrong
        </p>
        <h1 className="mt-3 text-xl font-black tracking-tight text-[var(--qs-ink)] sm:text-2xl">
          Oops! We hit a snag
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-relaxed text-[var(--qs-muted)]">
          An unexpected error occurred. Don&apos;t worry — your work is safe.
          Try again or head back home.
        </p>
        {error?.digest && (
          <p className="mt-3 font-mono text-[10px] text-[var(--qs-muted)]">
            Error ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/quiz"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-[13px] font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
