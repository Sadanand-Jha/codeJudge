"use client";

import { Wallet, Info } from "lucide-react";

/**
 * Credit system status. The backend currently tracks no credit balances or
 * transactions, so this panel intentionally shows an honest empty state
 * instead of sample numbers or misleading percentages.
 */
export function CreditsUsage() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-profile-border bg-profile-surface p-5">
      <h2 className="text-[14px] font-semibold text-profile-text-primary">Credits &amp; usage</h2>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-profile-border px-4 py-8 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-profile-surface-elevated">
          <Wallet className="h-4 w-4 text-profile-text-muted" />
        </span>
        <p className="text-[13px] font-semibold text-profile-text-primary">No credit activity to show</p>
        <p className="max-w-[260px] text-[11px] leading-relaxed text-profile-text-muted">
          Credit balances, purchases and usage history will appear here once credit tracking is enabled for your
          account.
        </p>
        <p className="mt-1 inline-flex items-start gap-1.5 rounded-lg bg-profile-surface-elevated/70 px-3 py-2 text-left text-[11px] leading-relaxed text-profile-text-secondary">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-profile-text-muted" />
          Creating quizzes and inviting students remains fully available.
        </p>
      </div>
    </div>
  );
}
