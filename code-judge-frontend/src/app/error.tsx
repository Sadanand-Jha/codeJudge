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
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center">
          <span className="text-2xl">⚠</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Something went wrong</h1>
        <p className="text-sm text-[#9CA3AF] mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#9CA3AF] bg-[#111827] border border-white/[0.06] hover:text-white transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
