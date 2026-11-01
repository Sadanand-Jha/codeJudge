"use client";

import { ArrowRight, BadgePercent, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { CheckoutSuggestion } from "@/services/billing";
import { QS_ROW } from "./credits/styles";

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function perCredit(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function CheckoutSuggestionCard({
  suggestion,
  declined = false,
  onAccept,
  onDecline,
  onReopen,
}: {
  suggestion: CheckoutSuggestion;
  declined?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onReopen: () => void;
}) {
  if (declined) {
    return (
      <button
        type="button"
        onClick={onReopen}
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-[12px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 text-left text-xs font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)]"
      >
        <span className="flex items-center gap-1.5">
          <BadgePercent className="h-3.5 w-3.5" />
          {suggestion.kind === "plan_bundle"
            ? "See the bundle offer again"
            : `See the ${suggestion.pack.name} instead`}
        </span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <section
      aria-label="Recommended upgrade"
      aria-live="polite"
      className="mt-3 rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] p-3.5 text-[#1A1240] shadow-[3px_3px_0_var(--qs-ink)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#1A1240] bg-[#1A1240] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--qs-sun)]">
          <Sparkles className="h-3 w-3" />
          {suggestion.badge}
        </span>
        <span className="text-[12px] font-black tabular-nums">
          {suggestion.kind === "plan_bundle"
            ? `Save ${rupees(suggestion.savingsPaise)}`
            : `+${suggestion.extraCredits} credits`}
        </span>
      </div>

      <h3 className="mt-2 text-[15px] font-black leading-5">{suggestion.title}</h3>
      <p className="mt-1 text-[12px] font-semibold leading-[18px] opacity-80">
        {suggestion.description}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3 border-t-2 border-[#1A1240]/20 pt-2.5">
        <div>
          <span className="block text-[22px] font-black leading-none tabular-nums">
            {rupees(suggestion.amountPaise)}
          </span>
          {suggestion.kind === "plan_bundle" ? (
            <span className="mt-0.5 block text-[11px] font-bold opacity-70">
              <s>{rupees(suggestion.compareAtPaise)}</s> separately
            </span>
          ) : (
            <span className="mt-0.5 block text-[11px] font-bold opacity-70">
              {rupees(suggestion.comparedAmountPaise)} →{" "}
              {rupees(suggestion.amountPaise)} ·{" "}
              {suggestion.creditMultiplier.toFixed(1)}× credits
            </span>
          )}
        </div>
        <span className="text-right text-[11px] font-bold tabular-nums opacity-75">
          {perCredit(suggestion.perCreditPaise)}
          <br />
          per credit
        </span>
      </div>

      <div className={cn(QS_ROW, "mt-2 border-t-2 border-[#1A1240]/20 py-2")}>
        <span className="text-sm font-semibold">Total credits</span>
        <b className="text-sm font-black tabular-nums">
          {suggestion.credits.toLocaleString("en-IN")}
        </b>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[#1A1240] bg-[#1A1240] px-3 py-2.5 text-[13px] font-extrabold text-[var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0"
        >
          {suggestion.kind === "plan_bundle" ? "Get the bundle" : `Switch to ${suggestion.pack.name}`}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="rounded-[12px] px-2 py-2.5 text-[12px] font-bold underline decoration-2 underline-offset-2 opacity-70 hover:opacity-100"
        >
          No thanks
        </button>
      </div>
    </section>
  );
}
