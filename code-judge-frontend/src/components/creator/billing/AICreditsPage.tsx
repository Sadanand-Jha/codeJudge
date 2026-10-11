"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Coins,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/helpers";
import { useBillingData } from "./hooks";
import { CreditPacksSection } from "./CreditPacksSection";
import { CreditPackCheckout, type CheckoutPayload } from "./CreditPackCheckout";
import {
  BillButton,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  Panel,
  PanelSkeleton,
  formatINR,
} from "./ui";
import {
  buildOrderSummary,
  createCreditOrder,
  getCreditValidityMonths,
  getPurchasePacks,
  openRazorpayCheckout,
  verifyCreditPayment,
  type CreditOrder,
  type CreditPurchasePack,
  type PackOrderSummary,
} from "@/services/aiCredits";

type PurchasePhase = "summary" | "processing" | "success" | "failed" | "cancelled";

const HOW_IT_WORKS = [
  {
    title: "What uses credits?",
    body: "A complete paper can include question retrieval from our curated bank, AI generation, evaluation, validation and refinement. The whole workflow counts against your balance — not each individual model call.",
  },
  {
    title: "How far will my credits go?",
    body: "It depends on paper complexity and AI work involved. Simple papers use less; long syllabi and repeated refinements use more. Generation stops safely before overshooting — never a surprise charge.",
  },
  {
    title: "Failed generations and refunds",
    body: "Failed operations caused by our servers or providers are refunded automatically. Duplicate charges and duplicate grants are prevented on the backend.",
  },
];

export function AICreditsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const balance = useAICreditsStore((s) => s.balance);
  const refreshCredits = useAICreditsStore((s) => s.refresh);
  const [refreshing, setRefreshing] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const { state, data, retry } = useBillingData(() => ({ packs: getPurchasePacks() }), {
    demoState,
  });
  const validityMonths = getCreditValidityMonths();

  const [packId, setPackId] = useState<string | null>(null);
  const [view, setView] = useState<"packs" | "checkout">("packs");
  const [checkoutPackId, setCheckoutPackId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<PurchasePhase>("summary");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [processingNote, setProcessingNote] = useState("Creating your order…");
  const [receipt, setReceipt] = useState<{
    transactionId: string;
    packName: string;
    credits: number;
    newBalance: number;
  } | null>(null);

  const selected: PackOrderSummary | null = packId ? buildOrderSummary(packId) : null;

  const closeModal = () => {
    if (phase === "processing") return;
    if (phase === "success") setView("packs");
    setPackId(null);
  };

  /* Pricing card CTA → open the full checkout screen preselected. */
  const openCheckout = (id: string) => {
    setCheckoutPackId(id);
    setView("checkout");
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const backToPacks = () => {
    if (phase === "processing") return;
    setView("packs");
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshCredits();
    } finally {
      setRefreshing(false);
    }
  };

  const runPurchase = async (args: {
    packId: string;
    total?: number;
    coupon?: string;
    prefill?: { email?: string; method?: string; vpa?: string };
    notes?: Record<string, string>;
  }) => {
    if (phase === "processing") return;
    setPackId(args.packId);
    setPhase("processing");
    setPhaseError(null);
    setReceipt(null);
    try {
      setProcessingNote("Creating your order…");
      const summary = buildOrderSummary(args.packId);
      const order: CreditOrder = await createCreditOrder(summary.pack.id, {
        coupon: args.coupon,
        amountPaise: args.total !== undefined ? Math.round(args.total * 100) : undefined,
      });
      setProcessingNote("Waiting for payment…");
      const payment = await openRazorpayCheckout({
        order,
        itemName: summary.pack.name,
        prefill: args.prefill,
        notes: args.notes,
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

  const handlePay = async () => {
    if (!selected || phase === "processing") return;
    await runPurchase({ packId: selected.pack.id });
  };

  const payFor = async (payload: CheckoutPayload) => {
    const notes: Record<string, string> = {
      method: payload.methodLabel,
      receipt_email: payload.email,
    };
    if (payload.app) notes.app = payload.app;
    if (payload.gstin) notes.gstin = payload.gstin;
    if (payload.coupon) notes.coupon = payload.coupon;
    await runPurchase({
      packId: payload.pack.id,
      total: payload.total,
      coupon: payload.coupon,
      prefill: {
        email: payload.email || undefined,
        method: payload.method,
        vpa: payload.vpa,
      },
      notes,
    });
  };

  // DEMO ONLY: grants credits locally after the UPI flow reports success.
  // Production must confirm payment through the gateway webhook on the
  // server (see the header comment in UpiPayment.tsx) and grant credits
  // from the verified backend response — never from the browser.
  const completeUpiPurchase = async ({ pack, orderId, total }: {
    pack: CreditPurchasePack;
    orderId: string;
    total: number;
  }) => {
    if (phase === "processing") return;
    setPackId(pack.id);
    setPhase("processing");
    setPhaseError(null);
    setReceipt(null);
    try {
      setProcessingNote("Confirming your UPI payment…");
      await new Promise((r) => setTimeout(r, 1200));
      const store = useAICreditsStore.getState();
      const newBalance = store.balance.totalRemaining + pack.credits;
      useAICreditsStore.setState({
        balance: {
          ...store.balance,
          purchasedCredits: store.balance.purchasedCredits + pack.credits,
          totalRemaining: newBalance,
          remaining: newBalance,
        },
        purchases: [
          ...store.purchases,
          { packId: pack.id, packName: pack.name, credits: pack.credits, price: total, timestamp: Date.now() },
        ],
      });
      await refreshCredits();
      setReceipt({
        transactionId: orderId,
        packName: pack.name,
        credits: pack.credits,
        newBalance,
      });
      setPhase("success");
      toast.success({
        title: "Credits added",
        description: `${pack.credits} AI credits are now available.`,
      });
    } catch (err: unknown) {
      setPhaseError(getApiErrorMessage(err, "Payment could not be completed. No amount was charged."));
      setPhase("failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Credits"
        subtitle="Power your next question paper with AI."
        actions={
          <BillButton variant="ghost" href="/creator/billing/transactions">
            Transaction history <ArrowRight className="h-3.5 w-3.5" />
          </BillButton>
        }
      />

      {state === "loading" && (
        <>
          <PanelSkeleton title="Available balance" />
          <PanelSkeleton title="Credit packs" />
        </>
      )}
      {state === "error" && <ErrorState onRetry={retry} message="Credit packs could not be loaded." />}
      {state === "empty" && (
        <EmptyState
          title="No credit packs available"
          description="Credit packs are configured by the administrator. Please check back later."
        />
      )}

      {state === "ready" && data && (
        <>
          {/* Balance strip — compact, one row */}
          <div className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5 dark:border-white/10 dark:bg-[#1e1419]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                <Coins className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] text-slate-500 dark:text-slate-400">
                  <span className="font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {balance.totalRemaining}
                  </span>{" "}
                  credits left
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Valid {validityMonths} months from purchase
                </p>
              </div>
            </div>
            <IconButton label={refreshing ? "Refreshing balance" : "Refresh balance"} onClick={handleRefresh}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </IconButton>
          </div>

          {/* Packs → checkout (card CTA opens the checkout screen) */}
          <div ref={sectionRef} className="scroll-mt-4">
            {view === "packs" ? (
              <CreditPacksSection onSelectPack={(pack) => openCheckout(pack.id)} />
            ) : (
              <CreditPackCheckout
                key={checkoutPackId ?? "default"}
                initialPackId={checkoutPackId ?? undefined}
                onBack={backToPacks}
                onPay={payFor}
                onUpiSuccess={completeUpiPurchase}
                processing={phase === "processing"}
              />
            )}
          </div>

          {/* How credits work */}
          <Panel
            title="How credits work"
            subtitle="What you are charged for, in plain language"
            action={
              <button
                type="button"
                onClick={() => setExplainerOpen((o) => !o)}
                aria-expanded={explainerOpen}
                className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                {explainerOpen ? "Hide" : "Learn more"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", explainerOpen && "rotate-180")} />
              </button>
            }
          >
            <AnimatePresence initial={false}>
              {explainerOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-4 overflow-hidden"
                >
                  {HOW_IT_WORKS.map((item) => (
                    <li key={item.title}>
                      <p className="text-[13px] font-semibold text-text-primary">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{item.body}</p>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            {!explainerOpen && (
              <p className="text-xs leading-5 text-text-secondary">
                One complete paper — retrieval, generation, evaluation and refinement together —
                counts once against your balance. Failed operations are refunded automatically.
              </p>
            )}
          </Panel>

          <p className="flex items-start gap-1.5 text-[11px] leading-5 text-text-muted">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            Payments are processed securely via Razorpay. Credits are added only after the
            payment is verified.
          </p>
        </>
      )}

      {/* Purchase modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-label={`Buy ${selected.pack.name}`}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="text-base font-bold tracking-tight text-text-primary">
                  {phase === "success" ? "Payment successful" : `Buy ${selected.pack.name}`}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={phase === "processing"}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                {phase === "summary" && (
                  <>
                    <dl className="space-y-2.5 rounded-xl border border-border bg-card-hover/50 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-text-secondary">Pack</dt>
                        <dd className="font-semibold text-text-primary">{selected.pack.name}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-text-secondary">Credits</dt>
                        <dd className="font-semibold tabular-nums text-text-primary">{selected.credits}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-text-secondary">Validity</dt>
                        <dd className="font-semibold text-text-primary">
                          {selected.pack.validityMonths} month{selected.pack.validityMonths !== 1 ? "s" : ""}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-2.5">
                        <dt className="font-semibold text-text-primary">Total (incl. GST)</dt>
                        <dd className="font-black tabular-nums text-text-primary">{formatINR(selected.total)}</dd>
                      </div>
                    </dl>
                    <BillButton variant="primary" className="mt-4 h-11 w-full justify-center" onClick={handlePay}>
                      <Lock className="h-4 w-4" /> Pay {formatINR(selected.total)}
                    </BillButton>
                    <p className="mt-2.5 text-center text-[11px] text-text-muted">
                      Secure checkout via Razorpay · UPI, cards & netbanking
                    </p>
                  </>
                )}

                {phase === "processing" && (
                  <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                    <p className="mt-3 text-sm font-semibold text-text-primary">{processingNote}</p>
                    <p className="mt-1 text-xs text-text-secondary">Do not close this window.</p>
                  </div>
                )}

                {phase === "success" && receipt && (
                  <div className="flex flex-col items-center py-4 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <CheckCircle2 className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-text-primary">
                      {receipt.credits} credits added to your balance
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-text-muted">
                      Transaction {receipt.transactionId} · Balance {receipt.newBalance}
                    </p>
                    <BillButton variant="primary" className="mt-5 h-11 w-full justify-center" onClick={closeModal}>
                      Done
                    </BillButton>
                  </div>
                )}

                {phase === "failed" && (
                  <div className="flex flex-col items-center py-4 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-500/10 text-rose-500">
                      <AlertCircle className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-text-primary">Payment failed</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-text-secondary">{phaseError}</p>
                    <div className="mt-5 flex w-full gap-2">
                      <BillButton variant="ghost" className="h-11 flex-1 justify-center" onClick={() => setPhase("summary")}>
                        Back
                      </BillButton>
                      <BillButton variant="primary" className="h-11 flex-1 justify-center" onClick={handlePay}>
                        Try again
                      </BillButton>
                    </div>
                  </div>
                )}

                {phase === "cancelled" && (
                  <div className="flex flex-col items-center py-4 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-card-hover text-text-secondary">
                      <Info className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-text-primary">Payment cancelled</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-text-secondary">
                      No amount was charged. Your order summary is still here if you want to continue.
                    </p>
                    <div className="mt-5 flex w-full gap-2">
                      <BillButton variant="ghost" className="h-11 flex-1 justify-center" onClick={closeModal}>
                        Close
                      </BillButton>
                      <BillButton variant="primary" className="h-11 flex-1 justify-center" onClick={() => setPhase("summary")}>
                        Resume
                      </BillButton>
                    </div>
                  </div>
                )}
              </div>

              {phase !== "processing" && phase !== "success" && (
                <p className="flex items-center justify-center gap-1.5 border-t border-border px-5 py-3 text-[11px] text-text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Credits are added only after backend payment verification
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
