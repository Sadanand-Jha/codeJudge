import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import GuestGuard from "@/components/guards/GuestGuard";
import QuizPartyAtmosphere from "@/components/quiz/live/QuizPartyAtmosphere";
import YourActivitySection from "@/components/quiz/live/YourActivitySection";

export const metadata: Metadata = {
  title: "Attempts — ByteClash",
  description: "Review your complete ByteClash quiz attempt history.",
};

export default function QuizAttemptsPage() {
  return (
    <GuestGuard action="join-contest">
      <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#F7F8FA] px-4 py-6 text-[#101828] dark:bg-[#0B0D10] dark:text-[#F4F6FA] sm:px-6 sm:py-8">
        <div className="pricing-bg-light pointer-events-none absolute inset-0 z-0 opacity-100 dark:opacity-0" aria-hidden="true" />
        <div className="pricing-bg-space pointer-events-none absolute inset-0 z-0 opacity-0 dark:opacity-100" aria-hidden="true" />
        <QuizPartyAtmosphere />

        <main className="relative z-10 mx-auto w-full max-w-[1280px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link href="/quiz#activity" className="inline-flex h-10 items-center gap-2 rounded-xl border border-pink-200/80 bg-white/75 px-3 text-xs font-bold text-[#475467] shadow-sm backdrop-blur-xl transition hover:border-pink-300 hover:text-pink-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#BAC3D3] dark:hover:border-violet-400/30 dark:hover:text-violet-300">
              <ArrowLeft className="h-4 w-4" /> Back to quiz home
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-200/80 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-pink-600 backdrop-blur-xl dark:border-violet-400/20 dark:bg-violet-500/[0.08] dark:text-violet-300">
              <History className="h-3.5 w-3.5" /> Complete history
            </span>
          </div>

          <YourActivitySection view="all" />
        </main>
      </div>
    </GuestGuard>
  );
}
