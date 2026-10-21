"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, CalendarClock, Coins, History, Sparkles, TriangleAlert } from "lucide-react";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
import { useToast } from "@/hooks/useToast";
import { checkLowCreditWarning, useAICreditsStore } from "@/store/aiCreditsStore";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";
import { useBillingData } from "./hooks";
import { PageHeader, formatINR } from "./ui";
import { CreditPacks } from "./credits/CreditPacks";
import { HowCreditsWork } from "./credits/HowCreditsWork";
import {
  OrderSummaryDialog,
  type PurchasePhase,
  type PurchaseReceipt,
} from "./credits/OrderSummaryDialog";
import { QS_OUTLINE_BTN } from "./credits/styles";
import {
  buildOrderSummary,
  createCreditOrder,
  getPurchasePacks,
  openRazorpayCheckout,
  verifyCreditPayment,
  type CreditOrder,
  type CreditPurchasePack,
  type PackOrderSummary,
} from "@/services/aiCredits";

export function AICreditsPage({
  demoState,
  initialPackId,
}: {
  demoState?: "empty" | "error";
  /** Deep link from /pricing — opens the checkout for this pack. */
  initialPackId?: string | null;
}) {
  const toast = useToast();
  const balance = useAICreditsStore((s) => s.balance);
  const purchases = useAICreditsStore((s) => s.purchases);
  const refreshCredits = useAICreditsStore((s) => s.refresh);
  const purchasePack = useAICreditsStore((s) => s.purchasePack);

  const { state, data, retry } = useBillingData(() => ({ packs: getPurchasePacks() }), {
    demoState,
  });

  const [packId, setPackId] = useState<string | null>(() =>
    initialPackId && getPurchasePacks().some((pack) => pack.id === initialPackId)
      ? initialPackId
      : null
  );
  const [phase, setPhase] = useState<PurchasePhase>("summary");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [processingNote, setProcessingNote] = useState("Creating your order…");
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);

  const selected: PackOrderSummary | null = packId ? buildOrderSummary(packId) : null;
  const low = checkLowCreditWarning(balance.totalRemaining, balance.monthlyAllowance || balance.monthlyCredits || 1);
  const monthlyUsed = balance.monthlyCreditsConsumed + balance.purchasedCreditsConsumed;
  const monthlyPct = balance.monthlyCredits > 0
    ? Math.min(100, Math.round((balance.monthlyCreditsConsumed / balance.monthlyCredits) * 100))
    : 0;

  const openSummary = (pack: CreditPurchasePack) => {
    setPackId(pack.id);
    setPhase("summary");
    setPhaseError(null);
    setReceipt(null);
  };

  const closeDialog = () => {
    if (phase === "processing") return;
    setPackId(null);
    setPhase("summary");
  };

  const runPurchase = async (args: { packId: string; method: string }) => {
    if (phase === "processing") return;
    setPhase("processing");
    setPhaseError(null);
    setReceipt(null);
    try {
      setProcessingNote("Creating your order…");
      const summary = buildOrderSummary(args.packId);
      const order: CreditOrder = await createCreditOrder(summary.pack.id);
      setProcessingNote("Waiting for payment…");
      const payment = await openRazorpayCheckout({
        order,
        itemName: summary.pack.name,
        prefill: { method: args.method },
        notes: { method: args.method },
        onDismiss: () => setPhase("cancelled"),
      });
      setProcessingNote("Verifying payment…");
      const verified = await verifyCreditPayment(order, payment);
      await refreshCredits();
      setReceipt({
        transactionId: verified.transactionId,
        packName: summary.pack.name,
        credits: verified.credits,
        newBalance: verified.newBalance,
      });
      setPhase("success");
      toast.success({
        title: "Credits added",
        description: `${verified.credits} AI credits are now available.`,
      });
    } catch (err: unknown) {
      setPhaseError(getApiErrorMessage(err, "Payment could not be completed. No amount was charged."));
      setPhase("failed");
    }
  };

  const handlePay = async (method: string) => {
    if (!selected) return;
    // UPI opens the QR page first; credits are confirmed after the scan.
    if (method === "upi") {
      setPhase("upi");
      setPhaseError(null);
      return;
    }
    await runPurchase({ packId: selected.pack.id, method });
  };

  const handleUpiSuccess = async (orderId: string) => {
    if (!selected) return;
    const summary = selected;
    setPhase("processing");
    setPhaseError(null);
    setProcessingNote("Confirming your payment…");
    try {
      await purchasePack(summary.pack.id);
      const newBalance = useAICreditsStore.getState().balance.totalRemaining;
      setReceipt({
        transactionId: orderId,
        packName: summary.pack.name,
        credits: summary.credits,
        newBalance,
      });
      setPhase("success");
      toast.success({
        title: "Credits added",
        description: `${summary.credits} AI credits are now available.`,
      });
    } catch (err: unknown) {
      setPhaseError(
        getApiErrorMessage(err, "Payment succeeded but credits could not be added. Please contact support.")
      );
      setPhase("failed");
    }
  };

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        title="AI Credits"
        subtitle="One-time credit packs for paper generation, quizzes and PDF exports."
        actions={
          <Link
            href="/creator/billing/transactions"
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <History className="h-4 w-4" />
            Transactions
          </Link>
        }
      />

      {state === "loading" && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
        </div>
      )}

      {state === "error" && (
        <div className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-8 text-center">
          <p className="text-lg font-extrabold">Credit packs could not be loaded.</p>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">
            Please check your connection and try again.
          </p>
          <button type="button" onClick={retry} className={`${QS_OUTLINE_BTN} mt-4`}>
            Try again
          </button>
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-8 text-center">
          <p className="text-lg font-extrabold">No credit packs available</p>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">
            Credit packs are configured by the administrator. Please check back later.
          </p>
        </div>
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="relative mb-4 mr-4 lg:col-span-2">
              <span aria-hidden="true" className="absolute -bottom-4 -right-4 left-4 top-4 rounded-[30px] bg-[var(--qs-sun)]" />
              <article className="relative flex h-full flex-col rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.08em]",
                      low ? "text-[#a85d00]" : "text-[var(--qs-ok)]"
                    )}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {low ? "Running low" : "Ready to use"}
                    </span>
                    <h2 className="qs-display mt-3 text-[21px] font-extrabold text-[var(--qs-ink)]">Your credit balance</h2>
                  </div>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                    <Sparkles className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                </div>

                <p className="mt-4 leading-none">
                  <span className="qs-display text-[48px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[56px]">
                    {balance.totalRemaining.toLocaleString("en-IN")}
                  </span>
                  <span className="ml-2.5 align-middle text-[15px] font-bold text-[var(--qs-muted)]">credits available</span>
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {[
                    ["Monthly plan", balance.monthlyCredits.toLocaleString("en-IN")],
                    ["Purchased", balance.purchasedCredits.toLocaleString("en-IN")],
                    ["Used this month", monthlyUsed.toLocaleString("en-IN")],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.09em] text-[var(--qs-muted)]">{label}</p>
                      <p className="qs-display mt-1 text-[20px] font-extrabold tabular-nums text-[var(--qs-ink)]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-[var(--qs-muted)]">
                    <span>Monthly plan usage</span>
                    <span className="tabular-nums text-[var(--qs-ink)]">{monthlyPct}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)]">
                    <div className="h-full rounded-full bg-[var(--qs-brand)]" style={{ width: `${monthlyPct}%` }} />
                  </div>
                </div>

                {low && (
                  <p className="mt-4 flex items-start gap-2.5 rounded-2xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/20 p-3 text-[12px] font-medium leading-5 text-[var(--qs-ink)]">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    You are running low. Pick a pack below to keep generating without interruption.
                  </p>
                )}
              </article>
            </div>

            <section className="flex h-full flex-col rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="qs-display text-[21px] font-extrabold text-[var(--qs-ink)]">Recent top-ups</h2>
                  <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">Your latest credit purchases</p>
                </div>
                <Link href="/creator/billing/transactions" className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--qs-brand)] hover:underline">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {purchases.length === 0 ? (
                <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--qs-line)] px-4 py-8 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--qs-line)] text-[var(--qs-muted)]">
                    <Coins className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-[13px] font-bold text-[var(--qs-ink)]">No top-ups yet</p>
                  <p className="mt-1 max-w-[210px] text-[12px] leading-5 text-[var(--qs-muted)]">
                    Choose a pack below to add credits instantly.
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  {purchases.slice(0, 4).map((purchase, index) => (
                    <div
                      key={`${purchase.packId}-${purchase.timestamp}`}
                      className={cn("flex items-center gap-3 py-3", index > 0 && "border-t-2 border-[var(--qs-line)]")}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
                        <Coins className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <b className="block truncate text-[13px] font-bold text-[var(--qs-ink)]">{purchase.packName}</b>
                        <small className="block text-[11px] text-[var(--qs-muted)]">
                          {new Date(purchase.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </small>
                      </div>
                      <div className="shrink-0 text-right">
                        <b className="block text-[13px] font-extrabold tabular-nums text-[var(--qs-ink)]">+{purchase.credits}</b>
                        <small className="block text-[11px] tabular-nums text-[var(--qs-muted)]">{formatINR(purchase.price)}</small>
                      </div>
                    </div>
                  ))}
                  <p className="mt-3 flex items-center gap-1.5 border-t-2 border-[var(--qs-line)] pt-3 text-[11px] text-[var(--qs-muted)]">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Each pack has its own validity period.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div id="credit-packs">
            <CreditPacks packs={data.packs} onSelect={openSummary} />
          </div>
          <HowCreditsWork />
        </>
      )}

      <AnimatePresence>
        {selected && (
          <OrderSummaryDialog
            key={selected.pack.id}
            summary={selected}
            balance={balance.totalRemaining}
            phase={phase}
            phaseError={phaseError}
            processingNote={processingNote}
            receipt={receipt}
            onClose={closeDialog}
            onPay={handlePay}
            onUpiSuccess={handleUpiSuccess}
            onBack={() => {
              setPhase("summary");
              setPhaseError(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
