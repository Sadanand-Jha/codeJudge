"use client";

import Link from "next/link";
import { Coins, History, Sparkles } from "lucide-react";
import { useAICreditsStore } from "@/store/aiCreditsStore";

export function CreditsUsage() {
  const balance = useAICreditsStore((state) => state.balance);
  const lastFetchedAt = useAICreditsStore((state) => state.lastFetchedAt);
  const showPlaceholder = lastFetchedAt === null;
  const planRemaining = Math.max(
    0,
    balance.monthlyCredits - balance.monthlyCreditsConsumed
  );
  const purchasedRemaining = Math.max(
    0,
    balance.purchasedCredits - balance.purchasedCreditsConsumed
  );

  return (
    <div className="flex h-full flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="qs-display text-[17px] font-extrabold text-[var(--qs-ink)]">
          Credits &amp; usage
        </h2>
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]">
          <Coins className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex flex-1 flex-col rounded-[16px] border-2 border-[var(--qs-line)] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--qs-muted)]">
          Available credits
        </p>
        <p className="qs-display mt-1 text-[30px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
          {showPlaceholder
            ? "—"
            : balance.totalRemaining.toLocaleString("en-IN")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[12px] bg-[var(--qs-bg)] px-3 py-2">
            <p className="text-[10px] font-semibold text-[var(--qs-muted)]">
              Plan credits
            </p>
            <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-[var(--qs-ink)]">
              {showPlaceholder ? "—" : planRemaining.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-[12px] bg-[var(--qs-bg)] px-3 py-2">
            <p className="text-[10px] font-semibold text-[var(--qs-muted)]">
              Purchased
            </p>
            <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-[var(--qs-ink)]">
              {showPlaceholder
                ? "—"
                : purchasedRemaining.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link
            href="/creator/billing/credits/usage"
            className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] px-3 py-2 text-[11px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <History className="h-3.5 w-3.5" />
            Usage history
          </Link>
          <Link
            href="/creator/billing/credits"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--qs-brand)] px-3 py-2 text-[11px] font-bold text-[var(--qs-on-brand)] transition-all hover:brightness-110"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Buy credits
          </Link>
        </div>
      </div>
    </div>
  );
}
