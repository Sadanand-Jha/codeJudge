"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
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
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
          <span className="text-2xl">⚠</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">Something went wrong</h1>
        <p className="text-sm text-text-secondary mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary bg-card border border-border hover:text-text-primary transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}