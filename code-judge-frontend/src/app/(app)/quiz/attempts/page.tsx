import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import GuestGuard from "@/components/guards/GuestGuard";
import YourActivitySection from "@/components/quiz/live/YourActivitySection";

export const metadata: Metadata = {
  title: "Attempts",
  description: "Review your complete QuizSupport quiz attempt history.",
};

export default function QuizAttemptsPage() {
  return (
    <GuestGuard action="join-contest">
      <div className="qs-ui relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[var(--qs-bg)] px-4 py-6 text-[var(--qs-ink)] sm:px-6 sm:py-8">
        <main className="relative z-10 mx-auto w-full max-w-[1280px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link href="/quiz" className="b sm gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to quiz home
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--qs-brand)]">
              <History className="h-3.5 w-3.5" /> Complete history
            </span>
          </div>

          <YourActivitySection view="all" />
        </main>
      </div>
    </GuestGuard>
  );
}
