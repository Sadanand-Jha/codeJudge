"use client";

import { Wallet, Info } from "lucide-react";

/**
 * Credit system status. The backend currently tracks no credit balances or
 * transactions, so this panel intentionally shows an honest empty state
 * instead of sample numbers or misleading percentages.
 */
export function CreditsUsage() {
  return (
    <div className="flex h-full flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <h2 className="qs-display text-[17px] font-extrabold text-[var(--qs-ink)]">Credits &amp; usage</h2>
      <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]">
          <Wallet className="h-4 w-4" />
        </span>
        <p className="text-[13px] font-extrabold text-[var(--qs-ink)]">No credit activity to show</p>
        <p className="max-w-[260px] text-[11px] leading-relaxed text-[var(--qs-muted)]">
          Credit balances, purchases and usage history will appear here once credit tracking is enabled for your
          account.
        </p>
        <p className="mt-1 inline-flex items-start gap-1.5 rounded-[12px] border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/20 px-3 py-2 text-left text-[11px] leading-relaxed text-[var(--qs-ink)]">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" />
          Creating quizzes and inviting students remains fully available.
        </p>
      </div>
    </div>
  );
}
