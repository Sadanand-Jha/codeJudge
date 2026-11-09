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

function PackCard({
  summary,
  balance,
  method,
  onMethodChange,
  onPay,
}: {
  summary: PackOrderSummary;
  balance: number;
  method: MethodId;
  onMethodChange: (method: MethodId) => void;
  onPay: () => void;
}) {
  const credits = Math.max(0, summary.credits);
  const months = summary.pack.validityMonths;
  const validity = `${months} month${months === 1 ? "" : "s"}`;

  return (
    <article className="flex flex-col rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-2.5 sm:rounded-[20px] sm:border-2 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold leading-tight tracking-normal sm:text-[20px] sm:font-extrabold sm:tracking-[-0.015em]">
          {summary.pack.name}
        </h3>
        <span className="whitespace-nowrap rounded-full bg-[var(--qs-bg)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--qs-muted)]">
          One-time
        </span>
      </div>
      <p className="mt-1 text-[10.5px] leading-[14px] text-[var(--qs-muted)] sm:mt-1.5 sm:text-[13.5px] sm:font-medium sm:leading-[1.4]">
        {summary.pack.blurb || `${credits.toLocaleString("en-IN")} AI credits for ${validity}.`}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold text-[var(--qs-brand)] sm:mt-3 sm:text-[12px] sm:font-bold">
        Top-up credits · no subscription needed
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="text-[24px] font-bold leading-7 tracking-normal sm:text-[38px] sm:font-extrabold sm:leading-none sm:tracking-[-0.03em]">
          {formatPricingAmount(summary.total, "INR")}
        </span>
        <span className="text-[10.5px] font-medium text-[var(--qs-muted)] sm:text-[13px] sm:font-bold">one-time</span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between gap-2 text-[12px] font-bold text-[var(--qs-brand)]">
          <span>Balance after</span>
          <span className="tabular-nums">
            {(balance + credits).toLocaleString("en-IN")} credits
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--qs-line)]">
          <div
            className="h-full rounded-full bg-[var(--qs-brand)]"
            style={{ width: "100%" }}
          />
        </div>
      </div>
      <hr className="my-3 border-0 border-t-2 border-dashed border-[var(--qs-line)]" />
      <ul className="grid gap-1.5 text-[11px] font-medium sm:gap-2 sm:text-[13.5px] sm:font-semibold">
        <li className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            <Check className="h-3 w-3" strokeWidth={2.6} />
          </span>
          {credits.toLocaleString("en-IN")} AI credits added instantly
        </li>
        <li className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            <Check className="h-3 w-3" strokeWidth={2.6} />
          </span>
          Valid for {validity} from purchase
        </li>
      </ul>

      <div className="mt-auto pt-2.5 sm:pt-4">
        <p className="mb-1.5 text-[10px] font-semibold text-[var(--qs-muted)] sm:mb-2 sm:text-[12px] sm:font-bold">Pay with</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={method === m.id}
              onClick={() => onMethodChange(m.id)}
              className={cn(
                "rounded-full border px-2 py-1 text-[10.5px] font-medium sm:border-2 sm:px-3.5 sm:py-1.5 sm:text-[12.5px] sm:font-bold transition-colors",
                method === m.id
                  ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onPay}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] px-2.5 py-2.5 text-[12px] font-semibold sm:gap-2 sm:rounded-[14px] sm:border-2 sm:px-4 sm:py-3 sm:text-[15px] sm:font-extrabold text-[var(--qs-ink)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-0.5 active:shadow-none"
        >
          <Lock className="h-3.5 w-3.5" /> Pay {formatPricingAmount(summary.total, "INR")}
        </button>
      </div>
    </article>
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
        style={
          suggestion && !declined && phase === "summary"
            ? { maxWidth: 780 }
            : undefined
        }
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
            <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-2 text-[11px] sm:mt-3 sm:gap-3 sm:rounded-[14px] sm:border-2 sm:px-4 sm:py-2.5 sm:text-sm">
              <span className="font-medium text-[var(--qs-muted)] sm:font-semibold">Current balance</span>
              <strong className="text-[12px] font-bold tabular-nums sm:text-base sm:font-extrabold">
                {balance.toLocaleString("en-IN")} credits
              </strong>
            </div>

            <div
              className={cn(
                "mt-3 grid gap-2.5 sm:mt-6 sm:gap-4",
                suggestion && !declined && "sm:grid-cols-[1fr_1.18fr] sm:items-stretch"
              )}
            >
              <PackCard
                summary={summary}
                balance={balance}
                method={method}
                onMethodChange={setMethod}
                onPay={() => onPay(method)}
              />
              {suggestion && !declined && (
                <UpgradeCard
                  suggestion={suggestion}
                  balance={balance}
                  selectedPackName={summary.pack.name}
                  onAccept={acceptSuggestion}
                  onDecline={declineSuggestion}
                />
              )}
            </div>

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

            <p className="mt-4 flex items-center justify-center gap-2.5 text-center text-[12.5px] font-semibold text-[var(--qs-muted)]">
              <CalendarClock className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
              Credits are added instantly and stay valid for{" "}
              {summary.pack.validityMonths} month
              {summary.pack.validityMonths === 1 ? "" : "s"} from purchase.
            </p>
            <p className="mt-1.5 text-center text-xs font-medium text-[var(--qs-muted)]">
              You&apos;ll complete the payment in the secure Razorpay window.
            </p>
            <p className="mt-1.5 text-center text-xs font-medium text-[var(--qs-muted)]">
              Secure payments via UPI, Cards &amp; Net Banking
            </p>
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
