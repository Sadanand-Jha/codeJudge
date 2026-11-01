"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarClock, History } from "lucide-react";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
import { useToast } from "@/hooks/useToast";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { getApiErrorMessage } from "@/lib/apiError";
import { trackCheckoutEvent } from "@/services/analytics";
import { PageHeader } from "./ui";
import { InvoiceV2Dialog } from "./InvoiceV2Dialog";
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
  openRazorpayCheckout,
  RazorpayCheckoutDismissedError,
  verifyCreditPayment,
  type CreditOrder,
  type CreditPurchasePack,
  type PackOrderSummary,
} from "@/services/aiCredits";
import type { AICreditPaymentMethod } from "@/types/aiCredits";

function paymentMethod(method: string): AICreditPaymentMethod {
  return method === "card" || method === "netbanking" ? method : "upi";
}

export function AICreditsPage({
  demoState,
  initialPackId,
}: {
  demoState?: "empty" | "error";
  /** Deep link from /pricing/credits — opens the checkout for this pack. */
  initialPackId?: string | null;
}) {
  const toast = useToast();
  const balance = useAICreditsStore((s) => s.balance);
  const refreshCredits = useAICreditsStore((s) => s.refresh);
  const purchasePack = useAICreditsStore((s) => s.purchasePack);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);
  const { catalog, isLoading: catalogLoading, error: catalogError, refresh: refreshCatalog } = usePricingCatalog();
  const packs = catalog.creditPacks;
  const state =
    demoState === "error" || catalogError
      ? "error"
      : demoState === "empty"
        ? "empty"
        : catalogLoading
          ? "loading"
          : packs.length === 0
            ? "empty"
            : "ready";
  const data = state === "ready" ? { packs } : null;
  const retry = () => {
    if (demoState) return;
    void refreshCatalog();
  };

  const [packId, setPackId] = useState<string | null>(initialPackId ?? null);
  const [dismissedInitialPack, setDismissedInitialPack] = useState(false);
  const [phase, setPhase] = useState<PurchasePhase>("summary");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [processingNote, setProcessingNote] = useState("Creating your order…");
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const selectedPackId =
    packId && packs.some((pack) => pack.id === packId)
      ? packId
      : !dismissedInitialPack &&
          initialPackId &&
          packs.some((pack) => pack.id === initialPackId)
        ? initialPackId
        : null;
  const selected: PackOrderSummary | null = selectedPackId
    ? buildOrderSummary(selectedPackId, packs)
    : null;

  const openSummary = (pack: CreditPurchasePack) => {
    setPackId(pack.id);
    setPhase("summary");
    setPhaseError(null);
    setReceipt(null);
  };

  const closeDialog = () => {
    if (phase === "processing") return;
    setDismissedInitialPack(true);
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
      const summary = buildOrderSummary(args.packId, packs);
      const order: CreditOrder = await createCreditOrder(summary.pack.id, {
        packs,
      });
      setProcessingNote("Waiting for payment…");
      const payment = await openRazorpayCheckout({
        order,
        itemName: summary.pack.name,
        prefill: { method: args.method },
        notes: { method: args.method },
      }).catch((error: unknown) => {
        if (error instanceof RazorpayCheckoutDismissedError) return null;
        throw error;
      });
      if (!payment) {
        setPhase("cancelled");
        return;
      }
      setProcessingNote("Verifying payment…");
      const verified = await verifyCreditPayment(order, payment);
      trackCheckoutEvent({
        event: "purchase_completed",
        productId: `pack:${summary.pack.id}`,
      });
      await purchasePack(summary.pack.id, {
        transactionId: verified.transactionId,
        method: paymentMethod(args.method),
        status: "completed",
        credits: verified.credits || summary.pack.credits,
        packName: summary.pack.name,
        price: summary.pack.price,
      });
      await refreshCredits();
      const newBalance = useAICreditsStore.getState().balance.totalRemaining;
      setReceipt({
        transactionId: verified.transactionId,
        orderId: verified.orderId,
        packName: summary.pack.name,
        credits: verified.credits,
        newBalance: newBalance || verified.newBalance,
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
    await runPurchase({ packId: selected.pack.id, method });
  };

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        title="AI Credits"
        subtitle="Top up credits whenever you need them."
        actions={
          <>
            <Link
              href="/creator/billing/plans"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              <CalendarClock className="h-4 w-4" />
              Monthly plans
            </Link>
            <Link
              href="/creator/billing/transactions"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              <History className="h-4 w-4" />
              Transactions
            </Link>
          </>
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
          <div id="credit-packs">
            <CreditPacks packs={data.packs} onSelect={openSummary} />
          </div>
          <HowCreditsWork
            validityMonths={
              packs.length > 0
                ? Math.max(...packs.map((pack) => pack.validityMonths))
                : undefined
            }
          />
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
            onViewInvoice={setInvoiceOrderId}
            onSwitchPack={(packCode) => {
              if (!packs.some((pack) => pack.id === packCode)) {
                toast.error({
                  title: "Pack unavailable",
                  description: "The recommended pack is no longer available.",
                });
                return;
              }
              setPackId(packCode);
              setPhase("summary");
              setPhaseError(null);
            }}
            onBack={() => {
              setPhase("summary");
              setPhaseError(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {invoiceOrderId && (
          <InvoiceV2Dialog
            orderId={invoiceOrderId}
            onClose={() => setInvoiceOrderId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
