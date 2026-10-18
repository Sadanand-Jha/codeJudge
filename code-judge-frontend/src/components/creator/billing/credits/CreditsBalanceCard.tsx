"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { QS_SQ_BTN } from "./styles";

export function CreditsBalanceCard({
  balance,
  validityMonths,
  refreshing,
  onRefresh,
}: {
  balance: number;
  validityMonths: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="flex flex-wrap items-center gap-5 rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-6 py-5">
      <span className="grid h-16 w-16 flex-none place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
        <Sparkles className="h-7 w-7" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-[clamp(36px,6vw,56px)] font-black leading-none tabular-nums tracking-tight">
            {balance}
          </span>
          <span className="text-xl font-bold text-[var(--qs-muted)]">credits left</span>
        </p>
        <p className="mt-1 text-sm font-medium text-[var(--qs-muted)]">
          Valid {validityMonths} months from purchase
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label={refreshing ? "Refreshing balance" : "Refresh balance"}
        className={QS_SQ_BTN}
      >
        <RefreshCw className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} />
      </button>
    </section>
  );
}
