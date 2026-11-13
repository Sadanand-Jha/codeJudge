"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  FileText,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { PackOrderSummary } from "@/services/aiCredits";
import {
  getCheckoutSuggestion,
  type PackUpgradeSuggestion,
} from "@/services/billing";
import { formatPricingAmount } from "@/services/pricing";
import { trackCheckoutEvent } from "@/services/analytics";
import { QS_DIALOG_PANEL, QS_SQ_BTN } from "./styles";

export type PurchasePhase = "summary" | "processing" | "success" | "failed" | "cancelled";

export interface PurchaseReceipt {
  transactionId: string;
  orderId: string;
  packName: string;
  credits: number;
  newBalance: number;
}

const METHODS = [
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "netbanking", label: "Net Banking" },
] as const;

function PhaseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
      {children}
    </div>
  );
}

type MethodId = (typeof METHODS)[number]["id"];

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function perCredit(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function CheckoutCoins() {
  const coinFace: React.CSSProperties = {
    background: "radial-gradient(circle at 35% 30%, #ffe18a, #f5b72b 55%, #c98310)",
    boxShadow:
      "inset 0 0 0 4px #e9a71f, inset 0 0 0 6px #fbd160, 0 8px 14px rgba(160,100,0,.3)",
  };

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex h-[150px] w-full max-w-[240px] items-center justify-center sm:h-[170px]"
    >
      <span className="absolute bottom-2 h-3.5 w-24 rounded-[50%] bg-[#7c5cff]/15 blur-[2px]" />
      <span className="absolute left-3 top-4 text-[18px] text-[#f5b72b]">✦</span>
      <span className="absolute right-4 top-3 text-[16px] text-[#7c5cff]">✦</span>
      <span
        className="absolute left-2 top-[92px] grid h-[54px] w-[54px] place-items-center rounded-full text-[22px] font-bold text-[#a35f00]"
        style={coinFace}
      >
        ★
      </span>
      <span
        className="relative z-10 grid h-[104px] w-[104px] place-items-center rounded-full text-[44px] font-bold text-[#a35f00] sm:h-[112px] sm:w-[112px] sm:text-[50px]"
        style={coinFace}
      >
        ₹
      </span>
      <span
        className="absolute right-3 top-[96px] grid h-[44px] w-[44px] place-items-center rounded-full text-[18px] font-bold text-[#a35f00]"
        style={coinFace}
      >
        ★
      </span>
    </div>
  );
}

function PackCard({ summary, balance }: { summary: PackOrderSummary; balance: number }) {
  const credits = Math.max(0, summary.credits);
  const months = summary.pack.validityMonths;
  const validity = `${months} month${months === 1 ? "" : "s"}`;
  const balanceAfter = balance + credits;
  const addedPercent = balanceAfter > 0 ? (credits / balanceAfter) * 100 : 0;
  const currentPercent = Math.max(0, 100 - addedPercent);
  const perCreditRate =
    credits > 0 ? `≈ ₹${(summary.total / credits).toFixed(2)} per credit` : "Best value pack";
  const badge = /master\s*pack/i.test(summary.pack.name)
    ? "Best value"
    : summary.pack.popular
      ? "Limited offer"
      : "One-time pack";

  return (
    <article className="rounded-[20px] border-2 border-[var(--qs-ink)] bg-[linear-gradient(160deg,var(--qs-surface),var(--qs-bg)_160%)] p-4 shadow-[0_18px_40px_-18px_rgba(124,92,255,0.35)] sm:rounded-[24px] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[20px] font-extrabold tracking-[-0.01em] sm:text-[22px]">Order summary</h3>
        <span className="rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--qs-muted)]">
          Current balance · <b className="text-[var(--qs-ink)]">{balance.toLocaleString("en-IN")}</b> credits
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-[190px_1fr] sm:items-center sm:gap-5">
        <CheckoutCoins />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[22px] font-extrabold tracking-[-0.01em] sm:text-[24px]">{summary.pack.name}</h4>
            <span className="rounded-full bg-[linear-gradient(90deg,#7c5cff,#4a2fd8)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] !text-white">
              {badge}
            </span>
          </div>
          <p className="mt-2 text-[44px] font-black leading-none tracking-[-0.03em] sm:text-[54px]">
            {formatPricingAmount(summary.total, "INR")}
            <span className="ml-2 text-[12px] font-medium tracking-normal text-[var(--qs-muted)] sm:text-[13px]">
              one-time payment
            </span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f0d28a] bg-[#fff3d1] py-1.5 pl-1.5 pr-3 text-[13px] font-bold text-[#5a3b00]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe18a,#e9a71f)] text-[10px] text-white">
                ★
              </span>
              {credits.toLocaleString("en-IN")} credits
            </span>
            <span className="rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--qs-muted)]">
              {perCreditRate}
            </span>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--qs-muted)]">
            {summary.pack.blurb || `Add ${credits.toLocaleString("en-IN")} AI credits, valid for ${validity}.`}
          </p>
        </div>
      </div>

      <hr className="my-4 border-0 border-t-2 border-dashed border-[var(--qs-line)] sm:my-5" />

      <div className="rounded-[14px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-[#4a2fd8]">Balance after purchase</span>
          <span className="text-[12px] font-bold tabular-nums text-[#4a2fd8]">
            {balanceAfter.toLocaleString("en-IN")} credits
          </span>
        </div>
        <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-[var(--qs-bg)]">
          <i className="block h-full bg-[#c9bff5]" style={{ width: `${currentPercent}%` }} />
          <i
            className="block h-full bg-[linear-gradient(90deg,#7c5cff,#4a2fd8)]"
            style={{ width: `${addedPercent}%` }}
          />
        </div>
      </div>

      <hr className="my-4 border-0 border-t-2 border-dashed border-[var(--qs-line)] sm:my-5" />

      <ul className="grid list-none gap-2.5 p-0">
        {[
          `${credits.toLocaleString("en-IN")} AI credits added instantly`,
          "Generate MCQ, short & long questions",
          "Export to PDF / Word",
          `Valid for ${validity} from purchase`,
        ].map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-[13px] font-semibold">
            <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[#4a2fd8] !text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PaymentCard({
  summary,
  method,
  onMethodChange,
  onPay,
}: {
  summary: PackOrderSummary;
  method: MethodId;
  onMethodChange: (method: MethodId) => void;
  onPay: () => void;
}) {
  const credits = Math.max(0, summary.credits);
  const months = summary.pack.validityMonths;
  const validity = `${months} month${months === 1 ? "" : "s"}`;

  return (
    <aside className="rounded-[20px] border-2 border-[var(--qs-ink)] bg-[linear-gradient(160deg,var(--qs-surface),var(--qs-bg)_160%)] p-4 shadow-[0_18px_40px_-18px_rgba(124,92,255,0.35)] sm:rounded-[24px] sm:p-6">
      <h3 className="text-[20px] font-extrabold tracking-[-0.01em] sm:text-[22px]">Payment</h3>

      <div className="mt-4 grid gap-2.5 text-[13px] text-[var(--qs-muted)]">
        <div className="flex items-center justify-between gap-3">
          <span>Pack</span>
          <b className="text-[var(--qs-ink)]">{summary.pack.name}</b>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Credits</span>
          <b className="text-[var(--qs-ink)]">+{credits.toLocaleString("en-IN")}</b>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Validity</span>
          <b className="text-[var(--qs-ink)]">{validity}</b>
        </div>
        <hr className="my-1 border-0 border-t-2 border-dashed border-[var(--qs-line)]" />
        <div className="flex items-center justify-between gap-3 text-[16px] font-bold text-[var(--qs-ink)]">
          <span>Total</span>
          <span>{formatPricingAmount(summary.total, "INR")}</span>
        </div>
      </div>

      <hr className="my-4 border-0 border-t-2 border-dashed border-[var(--qs-line)]" />

      <p className="text-[13px] font-bold">Pay with</p>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={method === m.id}
            onClick={() => onMethodChange(m.id)}
            className={cn(
              "rounded-[12px] border-2 px-2 py-2.5 text-[12px] font-bold transition-colors sm:text-[13px]",
              method === m.id
                ? "border-[#4a2fd8] bg-[var(--qs-bg)] text-[var(--qs-ink)] shadow-[0_0_0_3px_rgba(124,92,255,0.18)]"
                : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[#4a2fd8]"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onPay}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-[linear-gradient(90deg,#7c5cff,#4a2fd8)] px-4 py-4 text-[15px] font-bold !text-white shadow-[0_12px_24px_-10px_#4a2fd8] transition-[filter] hover:brightness-110"
      >
        <Lock className="h-[18px] w-[18px]" />
        Pay {formatPricingAmount(summary.total, "INR")}
      </button>

      <p className="mt-3 flex gap-2 text-[11.5px] leading-relaxed text-[var(--qs-muted)]">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#4a2fd8]" />
          <span>
            Credits are added instantly and stay valid for {validity} from purchase.
          </span>
      </p>
      <p className="mt-4 border-t-2 border-dashed border-[var(--qs-line)] pt-3 text-center text-[11px] text-[var(--qs-muted)]">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-[#4a2fd8]" />
        Credits are added only after backend payment verification
      </p>
    </aside>
  );
}

function UpgradeCard({
  suggestion,
  balance,
  selectedPackName,
  onAccept,
  onDecline,
}: {
  suggestion: PackUpgradeSuggestion;
  balance: number;
  selectedPackName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const pack = suggestion.pack;
  const source = suggestion.sourcePack;
  const upgradeCreditsAfter = balance + suggestion.credits;
  const multiple =
    source.credits > 0 ? suggestion.credits / source.credits : 0;
  const extraRupees = Math.max(0, suggestion.priceDifferencePaise) / 100;
  const sourceRatePaise =
    source.credits > 0 ? suggestion.comparedAmountPaise / source.credits : 0;

  return (
    <article className="relative order-first flex flex-col rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] p-2.5 text-[var(--qs-on-brand)] shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[20px] sm:border-2 sm:p-4 sm:shadow-[6px_6px_0_var(--qs-sun)] sm:order-none">
      <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--qs-ink)] px-3.5 py-[5px] text-[12px] font-extrabold text-[var(--qs-sun)]">
        <Sparkles className="h-3 w-3" />
        {suggestion.badge}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold leading-tight tracking-normal sm:text-[20px] sm:font-extrabold sm:tracking-[-0.015em]">
          {pack.name}
        </h3>
        <span className="whitespace-nowrap rounded-full bg-[var(--qs-sun)] px-2.5 py-1 text-[11px] font-extrabold text-[#1A1240]">
          +{suggestion.extraCredits} credits
        </span>
      </div>
      <p className="mt-1 text-[10.5px] leading-[14px] text-white/80 sm:mt-1.5 sm:text-[13.5px] sm:font-medium sm:leading-[1.4]">
        {suggestion.description}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="text-[24px] font-bold leading-7 tracking-normal sm:text-[38px] sm:font-extrabold sm:leading-none sm:tracking-[-0.03em]">
          {formatPricingAmount(suggestion.amountPaise / 100, "INR")}
        </span>
        <span className="text-[13px] font-bold text-white/80">today</span>
      </div>
      <p className="mt-1 text-[12px] font-bold text-[var(--qs-sun)]">
        {rupees(suggestion.comparedAmountPaise)} → {rupees(suggestion.amountPaise)}
        {multiple > 1 ? ` · ${Number(multiple.toFixed(1))}× credits` : ""}
      </p>
      <div className="mt-3">
        <div className="flex justify-between gap-2 text-[12px] font-bold text-[var(--qs-sun)]">
          <span>Balance after</span>
          <span className="text-right tabular-nums">
            {upgradeCreditsAfter.toLocaleString("en-IN")} credits
            {multiple > 1 ? ` · ${Number(multiple.toFixed(1))}× more` : ""}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-full rounded-full bg-[var(--qs-sun)]" />
        </div>
      </div>
      <hr className="my-3 border-0 border-t-2 border-dashed border-white/35" />
      <ul className="grid gap-1.5 text-[11px] font-medium sm:gap-2 sm:text-[13.5px] sm:font-semibold">
        <li className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
            <Check className="h-3 w-3" strokeWidth={2.6} />
          </span>
          {pack.name} — {pack.credits.toLocaleString("en-IN")} AI credits, valid{" "}
          {pack.validityDays} days
        </li>
        <li className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
            <Check className="h-3 w-3" strokeWidth={2.6} />
          </span>
          {suggestion.extraCredits} more credits than {selectedPackName}
        </li>
        <li className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
            <Check className="h-3 w-3" strokeWidth={2.6} />
          </span>
          {perCredit(suggestion.perCreditPaise)} per credit
          {sourceRatePaise > 0 ? `, not ${perCredit(sourceRatePaise)}` : ""}
        </li>
      </ul>
      <div className="mt-auto pt-2.5 sm:pt-4">
        <button
          type="button"
          onClick={onAccept}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-2.5 text-[12px] font-semibold sm:gap-2 sm:rounded-[14px] sm:border-2 sm:px-4 sm:py-3 sm:text-[15px] sm:font-extrabold text-[#1A1240] shadow-[0_4px_0_var(--qs-ink)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--qs-ink)] active:translate-y-0.5 active:shadow-none"
        >
          Switch to {pack.name} · {formatPricingAmount(suggestion.amountPaise / 100, "INR")}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="mt-1.5 w-full text-center text-[10px] font-semibold text-white/75 underline underline-offset-2 sm:mt-2 sm:text-[12px] sm:font-bold sm:decoration-2 sm:underline-offset-2 hover:text-white"
        >
          No thanks
        </button>
        <p className="mt-2 text-center text-[12px] font-semibold text-white/85">
          Just{" "}
          <b className="font-extrabold text-[var(--qs-sun)]">
            {formatPricingAmount(extraRupees, "INR")}
          </b>{" "}
          more than {selectedPackName} to get {suggestion.extraCredits} more credits
        </p>
      </div>
    </article>
  );
}

export function OrderSummaryDialog({
  summary,
  balance,
  phase,
  phaseError,
  processingNote,
  receipt,
  onClose,
  onPay,
  onSwitchPack,
  onBack,
  onViewInvoice,
}: {
  summary: PackOrderSummary;
  balance: number;
  phase: PurchasePhase;
  phaseError: string | null;
  processingNote: string;
  receipt: PurchaseReceipt | null;
  onClose: () => void;
  onPay: (method: string) => void;
  onSwitchPack: (packCode: string) => void;
  onBack: () => void;
  onViewInvoice?: (orderId: string) => void;
}) {
  const [method, setMethod] = useState<MethodId>("upi");
  const [suggestion, setSuggestion] = useState<PackUpgradeSuggestion | null>(null);
  const [declined, setDeclined] = useState(false);
  const busy = phase === "processing";

  useEffect(() => {
    let active = true;
    getCheckoutSuggestion({ packId: summary.pack.id })
      .then((response) => {
        if (!active || response.suggestion?.kind !== "pack_upgrade") return;
        setSuggestion(response.suggestion);
        trackCheckoutEvent({
          event: "suggestion_shown",
          suggestionType: response.suggestion.suggestionType,
          sourceProductId: response.suggestion.sourceProductId,
          productId: response.suggestion.productId,
          planCode: response.planCode,
        });
      })
      .catch(() => {
        // Checkout remains usable without a suggestion.
      });
    return () => {
      active = false;
    };
  }, [summary.pack.id]);

  const acceptSuggestion = () => {
    if (!suggestion) return;
    trackCheckoutEvent({
      event: "suggestion_accepted",
      suggestionType: suggestion.suggestionType,
      sourceProductId: suggestion.sourceProductId,
      productId: suggestion.productId,
    });
    onSwitchPack(suggestion.pack.code);
  };

  const declineSuggestion = () => {
    if (!suggestion) return;
    setDeclined(true);
    trackCheckoutEvent({
      event: "suggestion_declined",
      suggestionType: suggestion.suggestionType,
      sourceProductId: suggestion.sourceProductId,
      productId: suggestion.productId,
    });
  };

  const revisitSuggestion = () => {
    if (!suggestion) return;
    setDeclined(false);
    trackCheckoutEvent({
      event: "switch_back",
      suggestionType: suggestion.suggestionType,
      sourceProductId: suggestion.sourceProductId,
      productId: suggestion.productId,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[70] flex overflow-y-auto bg-[#1A1240]/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Buy ${summary.pack.name}`}
        className={cn(
          QS_DIALOG_PANEL,
          "m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
        )}
        style={phase === "summary" ? { maxWidth: 980 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-2.5 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
          <h2 className="text-[18px] font-bold tracking-tight sm:text-[26px] sm:font-black">
            {phase === "success" ? "Payment successful" : "Order summary"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className={cn(QS_SQ_BTN, "disabled:opacity-40")}
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </header>

        {phase === "summary" && (
          <>
            <div className="mt-3 grid gap-3 sm:mt-5 sm:grid-cols-[1.15fr_0.85fr] sm:items-start sm:gap-4">
              <PackCard summary={summary} balance={balance} />
              <PaymentCard
                summary={summary}
                method={method}
                onMethodChange={setMethod}
                onPay={() => onPay(method)}
              />
            </div>

            {suggestion && !declined && (
              <div className="mt-3">
                <UpgradeCard
                  suggestion={suggestion}
                  balance={balance}
                  selectedPackName={summary.pack.name}
                  onAccept={acceptSuggestion}
                  onDecline={declineSuggestion}
                />
              </div>
            )}

            {suggestion && declined && (
              <button
                type="button"
                onClick={revisitSuggestion}
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-[12px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 text-left text-xs font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)]"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  See the {suggestion.pack.name} instead
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}

        {phase === "processing" && (
          <PhaseShell>
            <Loader2 className="h-8 w-8 animate-spin text-[var(--qs-brand)]" />
            <p className="mt-3 text-sm font-bold">{processingNote}</p>
            <p className="mt-1 text-xs text-[var(--qs-muted)]">Do not close this window.</p>
          </PhaseShell>
        )}

        {phase === "success" && receipt && (
          <PhaseShell>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">
              {receipt.credits} credits added to your balance
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--qs-muted)]">
              Transaction {receipt.transactionId} · Balance {receipt.newBalance}
            </p>
            {onViewInvoice && (
              <button
                type="button"
                onClick={() => onViewInvoice(receipt.orderId)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-3 text-sm font-bold transition-colors hover:border-[var(--qs-brand)]"
              >
                <FileText className="h-4 w-4" />
                View invoice
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-2.5 w-full rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] py-2.5 text-[13px] font-bold sm:mt-3 sm:rounded-[14px] sm:border-2 sm:py-[15px] sm:text-base sm:font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              Done
            </button>
          </PhaseShell>
        )}

        {phase === "failed" && (
          <PhaseShell>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--qs-badbg)] text-[var(--qs-bad)]">
              <AlertCircle className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">Payment failed</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--qs-muted)]">{phaseError}</p>
            <div className="mt-5 flex w-full gap-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 text-[12px] font-semibold sm:rounded-[14px] sm:border-2 sm:py-3 sm:text-sm sm:font-bold transition-colors hover:border-[var(--qs-brand)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => onPay(method)}
                className="flex-1 rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] py-2.5 text-[12px] font-bold sm:rounded-[14px] sm:border-2 sm:py-3 sm:text-sm sm:font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
              >
                Try again
              </button>
            </div>
          </PhaseShell>
        )}

        {phase === "cancelled" && (
          <PhaseShell>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--qs-line)] text-[var(--qs-muted)]">
              <Info className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">Payment cancelled</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--qs-muted)]">
              No amount was charged. Your order summary is still here if you want to continue.
            </p>
            <div className="mt-5 flex w-full gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 text-[12px] font-semibold sm:rounded-[14px] sm:border-2 sm:py-3 sm:text-sm sm:font-bold transition-colors hover:border-[var(--qs-brand)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] py-2.5 text-[12px] font-bold sm:rounded-[14px] sm:border-2 sm:py-3 sm:text-sm sm:font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
              >
                Resume
              </button>
            </div>
          </PhaseShell>
        )}

        {phase !== "processing" && phase !== "success" && (
          <p className="mt-4 flex items-center justify-center gap-1.5 border-t-2 border-[var(--qs-line)] pt-3 text-[11px] font-medium text-[var(--qs-muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Credits are added only after backend payment verification
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
