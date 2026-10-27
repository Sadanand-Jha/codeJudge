"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getUserTimeZone } from "@/lib/timezone";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Download,
  FileText,
  Landmark,
  LifeBuoy,
  MoreHorizontal,
  ReceiptIndianRupee,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Smartphone,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { getBillingTransactions, type BillingTransaction } from "@/services/billing";
import { cn } from "@/lib/helpers";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
import { useBillingData } from "./hooks";
import { BillButton, EmptyState, ErrorState, PageHeader, StatCard, StatusBadge, formatINR, type StatusTone } from "./ui";

/* ============================================
   Data — recorded credit purchases.
   Expiry = purchase date + pack validity.
   ============================================ */

export type CreditTxnStatus = "completed" | "pending" | "failed" | "refunded";
export type PayMethodKind = "UPI" | "Card" | "NetBanking" | "Wallet" | "Razorpay";

export interface CreditTransaction {
  id: string;
  packId: string;
  packName: string;
  credits: number;
  price: number;
  timestamp: number;
  status: CreditTxnStatus;
  methodKind: PayMethodKind;
  methodLabel: string;
  methodRef: string;
  expiresAt?: number | null;
}

const DAY = 86_400_000;

type CreditValidityLookup = (packId: string) => number | undefined;

const CreditValidityContext = createContext<CreditValidityLookup>(() => undefined);

function useCreditValidity(): CreditValidityLookup {
  return useContext(CreditValidityContext);
}

function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    timeZone: getUserTimeZone(),
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { timeZone: getUserTimeZone(), month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(expiry: number, now: number): number {
  return Math.ceil((expiry - now) / DAY);
}

function txnExpiry(txn: CreditTransaction, getValidity: CreditValidityLookup): number | null {
  if (txn.expiresAt != null) return txn.expiresAt;
  const months = getValidity(txn.packId);
  return months ? addMonths(txn.timestamp, months) : null;
}

/* ============================================
   Small pieces
   ============================================ */

const STATUS_META: Record<CreditTxnStatus, { label: string; tone: StatusTone }> = {
  completed: { label: "Completed", tone: "emerald" },
  pending: { label: "Pending", tone: "amber" },
  failed: { label: "Failed", tone: "rose" },
  refunded: { label: "Refunded", tone: "slate" },
};

function StatusChip({ status }: { status: CreditTxnStatus }) {
  const meta = STATUS_META[status];
  return <StatusBadge label={meta.label} tone={meta.tone} dot />;
}

const METHOD_LABEL: Record<PayMethodKind, string> = {
  UPI: "UPI",
  Card: "Card",
  NetBanking: "Net Banking",
  Wallet: "Wallet",
  Razorpay: "Razorpay",
};

const METHOD_ICON: Record<PayMethodKind, LucideIcon> = {
  UPI: Smartphone,
  Card: CreditCard,
  NetBanking: Landmark,
  Wallet: Wallet,
  Razorpay: ReceiptIndianRupee,
};

function mapOrderStatus(status: BillingTransaction["status"]): CreditTxnStatus {
  switch (status) {
    case "paid":
      return "completed";
    case "refunded":
      return "refunded";
    case "failed":
    case "cancelled":
      return "failed";
    default:
      return "pending";
  }
}

function mapPaymentMethod(method: string | null | undefined): {
  kind: PayMethodKind;
  label: string;
} {
  const value = (method ?? "").toLowerCase();
  if (value.includes("card")) return { kind: "Card", label: METHOD_LABEL.Card };
  if (value.includes("net")) return { kind: "NetBanking", label: METHOD_LABEL.NetBanking };
  if (value.includes("wallet")) return { kind: "Wallet", label: METHOD_LABEL.Wallet };
  if (value.includes("upi")) return { kind: "UPI", label: METHOD_LABEL.UPI };
  return { kind: "Razorpay", label: METHOD_LABEL.Razorpay };
}

function mapBillingTransaction(txn: BillingTransaction): CreditTransaction {
  const method = mapPaymentMethod(txn.paymentMethod);
  const parsed = Date.parse(txn.paidAt ?? txn.createdAt);
  return {
    id: txn.orderNo,
    packId: txn.packCode ?? (txn.planSlug ? `plan:${txn.planSlug}` : txn.orderId),
    packName: txn.planName ?? txn.packName ?? "Credit purchase",
    credits: txn.credits,
    price: txn.amountPaise / 100,
    timestamp: Number.isNaN(parsed) ? Date.now() : parsed,
    status: mapOrderStatus(txn.status),
    methodKind: method.kind,
    methodLabel: method.label,
    methodRef: txn.gatewayPaymentId ?? txn.orderNo,
    expiresAt: txn.expiresAt
      ? (Number.isNaN(Date.parse(txn.expiresAt)) ? null : Date.parse(txn.expiresAt))
      : null,
  };
}

function ExpiryLine({ txn, now }: { txn: CreditTransaction; now: number }) {
  const getValidity = useCreditValidity();
  if (txn.status !== "completed") return null;
  const exp = txnExpiry(txn, getValidity);
  if (exp === null) return <p className="mt-0.5 text-xs text-[var(--qs-muted)]">Validity unavailable</p>;
  const left = daysLeft(exp, now);
  if (left < 0) return <p className="mt-0.5 text-xs font-semibold text-[var(--qs-bad)]">Expired</p>;
  if (left <= 14) {
    return (
      <p className="mt-0.5">
        <span className="inline-flex rounded-full bg-[var(--qs-sun)]/30 px-2 py-0.5 text-[11px] font-semibold text-[var(--qs-ink)]">
          Expires {fmtDate(exp)}
        </span>
      </p>
    );
  }
  return <p className="mt-0.5 text-xs text-[var(--qs-muted)]">Expires {fmtDate(exp)}</p>;
}

function SelectWrap({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="relative shrink-0">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-3.5 pr-9 text-[13px] font-semibold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" aria-hidden="true" />
    </div>
  );
}

function downloadFile(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function receiptText(txn: CreditTransaction, getValidity: CreditValidityLookup): string {
  const gst = txn.price - txn.price / 1.18;
  const expiry = txnExpiry(txn, getValidity);
  return [
    "QuizSupport — Payment Receipt",
    `Order ID: ${txn.id}`,
    `Item: ${txn.packName} (${txn.credits} credits)`,
    `Amount paid: ${formatINR(txn.price)} (incl. 18% GST of ${formatINR(gst)})`,
    `Payment method: ${txn.methodLabel} (${txn.methodRef})`,
    `Purchase date: ${fmtDateTime(txn.timestamp)}`,
    `Credits valid till: ${expiry ? fmtDate(expiry) : "Unavailable"}`,
    `Status: ${STATUS_META[txn.status].label}`,
  ].join("\n");
}

function invoiceText(txn: CreditTransaction): string {
  const base = txn.price / 1.18;
  const gst = txn.price - base;
  return [
    "QuizSupport — GST Invoice",
    `Order ID: ${txn.id}`,
    `Item: ${txn.packName} (${txn.credits} credits)`,
    `Taxable value: ${formatINR(base)}`,
    `GST @ 18%: ${formatINR(gst)}`,
    `Total (incl. GST): ${formatINR(txn.price)}`,
    `Payment method: ${txn.methodLabel}`,
    `Purchase date: ${fmtDateTime(txn.timestamp)}`,
  ].join("\n");
}

/* ============================================
   Detail drawer — right slide-over on desktop,
   bottom sheet on mobile. Esc + outside click
   close, focus trapped and restored.
   ============================================ */

function TxnDrawer({ txn, onClose, onReceipt, onInvoice }: {
  txn: CreditTransaction | null;
  onClose: () => void;
  onReceipt: (txn: CreditTransaction) => void;
  onInvoice: (txn: CreditTransaction) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  return (
    <AnimatePresence>
      {txn && (
        <DrawerShell txn={txn} onClose={onClose} panelRef={panelRef} onReceipt={onReceipt} onInvoice={onInvoice} />
      )}
    </AnimatePresence>
  );
}

function DrawerShell({ txn, onClose, panelRef, onReceipt, onInvoice }: {
  txn: CreditTransaction;
  onClose: () => void;
  panelRef: React.RefObject<HTMLElement | null>;
  onReceipt: (txn: CreditTransaction) => void;
  onInvoice: (txn: CreditTransaction) => void;
}) {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = panelRef.current;
    const closeBtn = node?.querySelector<HTMLElement>("[data-autofocus]");
    closeBtn?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && node) {
        const items = [...node.querySelectorAll<HTMLElement>("button, [href], input, select, [tabindex]:not([tabindex='-1'])")]
          .filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [txn, onClose, panelRef]);

  const getValidity = useCreditValidity();
  const expiry = txnExpiry(txn, getValidity);
  const base = txn.price / 1.18;
  const gst = txn.price - base;
  const MethodIcon = METHOD_ICON[txn.methodKind];

  const steps = txn.status === "completed"
    ? [{ label: "Initiated", done: true }, { label: "Paid", done: true }, { label: "Credits added", done: true }]
    : txn.status === "pending"
      ? [{ label: "Initiated", done: true }, { label: "Paid", done: false }, { label: "Credits added", done: false }]
      : txn.status === "failed"
        ? [{ label: "Initiated", done: true }, { label: "Payment failed", done: false, failed: true }]
        : [{ label: "Initiated", done: true }, { label: "Paid", done: true }, { label: "Credits added", done: true }, { label: "Refunded", done: true }];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        ref={panelRef}
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 48 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for order ${txn.id}`}
        className="absolute inset-x-3 bottom-3 top-auto flex max-h-[88vh] flex-col overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[0_24px_60px_rgba(26,18,64,0.24)] sm:inset-x-6 lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-full lg:max-w-md lg:rounded-none lg:border-l-2 lg:border-t-0 lg:border-r-0 lg:border-b-0"
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--qs-line)] px-5 py-4">
          <p className="text-[15px] font-bold text-[var(--qs-ink)]">Transaction details</p>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close transaction details"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--qs-muted)] outline-none transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--qs-muted)]">Order ID</p>
              <p className="text-sm font-bold tabular-nums text-[var(--qs-ink)]">{txn.id}</p>
            </div>
            <StatusChip status={txn.status} />
          </div>

          <div className="mt-4 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-sun)]/[0.12] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--qs-muted)]">
              {txn.packName} · <span className="tabular-nums">+{txn.credits} credits</span>
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums text-[var(--qs-ink)]">
              {formatINR(txn.price)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--qs-muted)]">incl. GST</p>
          </div>

          <dl className="mt-5">
            {[
              ["Credits", `+${txn.credits}`],
              ["Order value", formatINR(base)],
              ["GST (18%)", formatINR(gst)],
              ["Payment method", txn.methodLabel],
              [txn.methodKind === "Card" ? "Card" : "Reference", txn.methodRef],
              ["Purchase date", fmtDateTime(txn.timestamp)],
              ["Expiry date", expiry ? fmtDate(expiry) : "—"],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                className={cn(
                  "flex items-center justify-between py-2.5",
                  i !== arr.length - 1 && "border-b border-[var(--qs-line)]/70"
                )}
              >
                <dt className="text-xs text-[var(--qs-muted)]">{label}</dt>
                <dd className="text-xs font-semibold tabular-nums text-[var(--qs-ink)]">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-2 flex items-center gap-2.5 rounded-[14px] border-2 border-[var(--qs-line)] px-3.5 py-3">
            <MethodIcon className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" aria-hidden="true" />
            <p className="text-xs font-semibold text-[var(--qs-ink)]">{txn.methodLabel}</p>
          </div>

          <ol className="mt-5 space-y-0" aria-label="Payment timeline">
            {steps.map((s, i) => (
              <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
                {i !== steps.length - 1 && (
                  <span className="absolute left-[7px] top-5 h-full w-px bg-[var(--qs-line)]" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    "z-10 grid h-4 w-4 shrink-0 place-items-center rounded-full",
                    s.done ? "bg-[var(--qs-ok)]" : "failed" in s && s.failed ? "bg-[var(--qs-bad)]" : "border-2 border-[var(--qs-line)] bg-transparent"
                  )}
                >
                  {s.done && <Check className="h-2.5 w-2.5 text-white" aria-hidden="true" />}
                </span>
                <p className={cn("text-xs font-semibold", s.done ? "text-[var(--qs-ink)]" : "failed" in s && s.failed ? "text-[var(--qs-bad)]" : "text-[var(--qs-muted)]")}>
                  {s.label}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-2.5 border-t-2 border-[var(--qs-line)] px-5 py-4">
          <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => onReceipt(txn)}>
            Receipt
          </BillButton>
          <BillButton variant="ghost" icon={<FileText className="h-4 w-4" />} onClick={() => onInvoice(txn)}>
            GST invoice
          </BillButton>
        </div>
      </motion.aside>
    </motion.div>
  );
}

/* ============================================
   Page
   ============================================ */

type StatusFilter = "all" | CreditTxnStatus;
type RangeFilter = "all" | "30d" | "3m" | "year";
type SortKey = "newest" | "oldest" | "amount";

const PAGE_SIZE = 10;

export interface TransactionsPageProps {
  demoState?: "empty" | "error";
  onBuyCredits?: () => void;
  onRetry?: (txn: CreditTransaction) => void;
  onDownloadReceipt?: (txn: CreditTransaction) => void;
  onDownloadInvoice?: (txn: CreditTransaction) => void;
}

export function TransactionsPage({ demoState, onBuyCredits, onRetry, onDownloadReceipt, onDownloadInvoice }: TransactionsPageProps) {
  const toast = useToast();
  const balance = useAICreditsStore((s) => s.balance);
  const balanceLoaded = useAICreditsStore((s) => s.lastFetchedAt !== null);
  const { catalog } = usePricingCatalog();
  const validityByPack = useMemo(
    () => new Map(catalog.creditPacks.map((pack) => [pack.id, pack.validityMonths])),
    [catalog]
  );
  const getValidity = useCallback(
    (packId: string) => validityByPack.get(packId),
    [validityByPack]
  );
  const refreshCredits = useAICreditsStore((s) => s.refresh);
  const { state, data, retry } = useBillingData(
    () => getBillingTransactions(100),
    { demoState }
  );

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [range, setRange] = useState<RangeFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [activeTxn, setActiveTxn] = useState<CreditTransaction | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const menuRef = useRef<HTMLDivElement>(null);

  const allTxns = useMemo<CreditTransaction[]>(() => {
    return (data ?? [])
      .map(mapBillingTransaction)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let cutoff = 0;
    if (range === "30d") cutoff = now - 30 * DAY;
    if (range === "3m") {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      cutoff = d.getTime();
    }
    if (range === "year") cutoff = new Date(new Date().getFullYear(), 0, 1).getTime();
    const rows = allTxns.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (t.timestamp < cutoff) return false;
      if (q && !`${t.packName} ${t.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...rows].sort((a, b) =>
      sort === "oldest" ? a.timestamp - b.timestamp : sort === "amount" ? b.price - a.price : b.timestamp - a.timestamp
    );
  }, [allTxns, query, status, range, sort, now]);

  const completed = useMemo(() => allTxns.filter((t) => t.status === "completed"), [allTxns]);
  const stats = useMemo(() => ({
    count: completed.length,
    credits: completed.reduce((s, t) => s + t.credits, 0),
    spent: completed.reduce((s, t) => s + t.price, 0),
  }), [completed]);

  const nextExpiry = useMemo(() => {
    const upcoming = completed
      .map((t) => ({ t, exp: txnExpiry(t, getValidity) }))
      .filter((entry): entry is { t: CreditTransaction; exp: number } => entry.exp !== null && entry.exp > now)
      .sort((a, b) => a.exp - b.exp);
    return upcoming[0] ?? null;
  }, [completed, getValidity, now]);

  const expiringSoon = useMemo(() => {
    const cands = completed
      .map((t) => {
        const exp = txnExpiry(t, getValidity);
        return exp === null ? null : { t, exp, left: daysLeft(exp, now) };
      })
      .filter((entry): entry is { t: CreditTransaction; exp: number; left: number } => entry !== null && entry.left >= 0 && entry.left <= 14)
      .sort((a, b) => a.left - b.left);
    return cands[0] ?? null;
  }, [completed, getValidity, now]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  const setFilter = <T,>(setter: (v: T) => void) => (v: string) => {
    setter(v as T);
    setPage(1);
  };

  const buyProps = onBuyCredits ? { onClick: onBuyCredits } : { href: "/creator/billing/credits" };

  const handleReceipt = (txn: CreditTransaction) => {
    if (onDownloadReceipt) return onDownloadReceipt(txn);
    downloadFile(`${txn.id}-receipt.txt`, receiptText(txn, getValidity));
    toast.success({ title: "Receipt downloaded", description: `Receipt for order ${txn.id}.` });
  };

  const handleInvoice = (txn: CreditTransaction) => {
    if (onDownloadInvoice) return onDownloadInvoice(txn);
    downloadFile(`${txn.id}-gst-invoice.txt`, invoiceText(txn));
    toast.success({ title: "GST invoice downloaded", description: `Invoice for order ${txn.id}.` });
  };

  const handleRetry = (txn: CreditTransaction) => {
    if (onRetry) return onRetry(txn);
    toast.info({ title: "Retry unavailable", description: `Contact support for order ${txn.id}.` });
  };

  const copyOrderId = async (txn: CreditTransaction) => {
    try {
      await navigator.clipboard.writeText(txn.id);
      toast.success({ title: "Order ID copied", description: txn.id });
    } catch {
      toast.error({ title: "Copy failed", description: "Select the order ID manually." });
    }
    setOpenMenuId(null);
  };

  const exportCsv = () => {
    const head = "Order ID,Item,Credits,Amount (INR),Status,Payment method,Date,Expiry";
    const lines = filtered.map((t) =>
      [t.id, t.packName, t.credits, t.price, STATUS_META[t.status].label, t.methodLabel, fmtDateTime(t.timestamp), (() => { const exp = txnExpiry(t, getValidity); return exp ? fmtDate(exp) : "Unavailable"; })()]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success({ title: "Exported", description: `${filtered.length} transaction${filtered.length !== 1 ? "s" : ""} exported to CSV.` });
  };

  const openDrawer = (txn: CreditTransaction) => {
    setOpenMenuId(null);
    setActiveTxn(txn);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set([1, 2, safePage - 1, safePage, safePage + 1, totalPages - 1, totalPages]);
    return [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [totalPages, safePage]);

  return (
    <CreditValidityContext.Provider value={getValidity}>
      <div className="space-y-6">
        {/* Header */}
      <PageHeader
        title="Transactions"
        subtitle="Credit-pack and monthly plan payments on your account."
        actions={
          <BillButton variant="primary" className="shrink-0" {...buyProps}>
            Buy Credits
          </BillButton>
        }
      />

      {state === "loading" && (
        <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading transactions">
          <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
        </div>
      )}

      {state === "error" && (
        <ErrorState onRetry={retry} message="Transactions could not be loaded." />
      )}

      {(state === "empty" || (state === "ready" && allTxns.length === 0)) && (
        <EmptyState
          title="No payments yet"
          description="Buy a credit pack or choose a monthly plan to get started."
          icon={<ShoppingCart className="h-6 w-6" />}
          action={
            <BillButton variant="primary" {...buyProps}>
              Buy Credits
            </BillButton>
          }
        />
      )}

      {state === "ready" && allTxns.length > 0 && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total purchases" value={stats.count} display={String(stats.count)} accent="primary" icon={<ShoppingCart className="h-[18px] w-[18px]" />} />
            <StatCard label="Credits purchased" value={stats.credits} display={`+${stats.credits}`} accent="warning" icon={<Coins className="h-[18px] w-[18px]" />} />
            <StatCard label="Total spent" value={stats.spent} accent="success" icon={<ReceiptIndianRupee className="h-[18px] w-[18px]" />} />
            <StatCard
              label="Credits left"
              value={balance.totalRemaining}
              display={balanceLoaded ? String(balance.totalRemaining) : "—"}
              accent="info"
              icon={<Wallet className="h-[18px] w-[18px]" />}
              hint={nextExpiry ? `Next expiry: ${fmtDate(nextExpiry.exp)}` : "No active credits"}
            />
          </div>

          {/* Expiry warning */}
          {expiringSoon && (
            <div className="flex flex-col gap-2 rounded-[18px] border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
              <p className="flex items-start gap-2 text-[13px] font-semibold text-[var(--qs-ink)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {expiringSoon.t.credits} credits expire on {fmtDate(expiringSoon.exp)}. Use them before then.
              </p>
              <a
                href="/creator/tests/create"
                className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-[var(--qs-brand)] underline underline-offset-2 outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
              >
                Create paper <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          {/* Table card */}
          <div className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b-2 border-[var(--qs-line)] p-4 sm:p-5">
              <div className="relative flex-1">
                <label htmlFor="txn-search" className="sr-only">Search transactions</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" aria-hidden="true" />
                <input
                  id="txn-search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search by pack name or order ID"
                  className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-3.5 text-[13px] text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] hover:border-[var(--qs-brand)]/40 focus:border-[var(--qs-brand)] focus:ring-2 focus:ring-[var(--qs-brand)]/25"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:pb-0 [&::-webkit-scrollbar]:hidden">
                <SelectWrap id="txn-status" label="Filter by status" value={status} onChange={setFilter(setStatus)}
                  options={[
                    { id: "all", label: "All statuses" }, { id: "completed", label: "Completed" },
                    { id: "pending", label: "Pending" }, { id: "failed", label: "Failed" }, { id: "refunded", label: "Refunded" },
                  ]} />
                <SelectWrap id="txn-range" label="Filter by date range" value={range} onChange={setFilter(setRange)}
                  options={[
                    { id: "all", label: "All time" }, { id: "30d", label: "Last 30 days" },
                    { id: "3m", label: "Last 3 months" }, { id: "year", label: "This year" },
                  ]} />
                <SelectWrap id="txn-sort" label="Sort transactions" value={sort} onChange={setFilter(setSort)}
                  options={[
                    { id: "newest", label: "Newest first" }, { id: "oldest", label: "Oldest first" }, { id: "amount", label: "Amount high to low" },
                  ]} />
                <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={exportCsv} className="ml-auto shrink-0">
                  Export CSV
                </BillButton>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]" aria-hidden="true">
                  <Search className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-bold text-[var(--qs-ink)]">No transactions match your filters.</p>
                <button
                  type="button"
                  onClick={() => { setQuery(""); setStatus("all"); setRange("all"); setSort("newest"); setPage(1); }}
                  className="mt-2 text-[13px] font-bold text-[var(--qs-brand)] underline underline-offset-2 outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop + tablet table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full table-fixed border-collapse">
                    <caption className="sr-only">Billing transactions</caption>
                    <thead>
                      <tr className="border-b-2 border-[var(--qs-ink)]">
                        <th scope="col" className="w-[30%] px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Transaction</th>
                        <th scope="col" className="hidden w-[14%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)] lg:table-cell">Payment method</th>
                        <th scope="col" className="w-[15%] px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Credits</th>
                        <th scope="col" className="w-[12%] px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Amount</th>
                        <th scope="col" className="w-[13%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Status</th>
                        <th scope="col" className="w-[16%] px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--qs-line)]">
                      {pageItems.map((txn) => {
                        const MethodIcon = METHOD_ICON[txn.methodKind];
                        return (
                          <tr
                            key={txn.id}
                            tabIndex={0}
                            onClick={() => openDrawer(txn)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                if ((e.target as HTMLElement).closest("button")) return;
                                e.preventDefault();
                                openDrawer(txn);
                              }
                            }}
                            aria-label={`Open details for ${txn.packName}, order ${txn.id}`}
                            className="cursor-pointer outline-none transition-colors hover:bg-[var(--qs-sun)]/[0.12] focus-visible:bg-[var(--qs-sun)]/[0.12] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--qs-brand)]/40"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--qs-brand)]/[0.08] text-[var(--qs-brand)]" aria-hidden="true">
                                  <Coins className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-semibold text-[var(--qs-ink)]">{txn.packName}</p>
                                  <p className="mt-0.5 truncate text-[11px] tabular-nums text-[var(--qs-muted)]">
                                    {fmtDateTime(txn.timestamp)}
                                  </p>
                                  <p className="truncate text-[11px] tabular-nums text-[var(--qs-muted)]">Order #{txn.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="hidden px-3 py-3.5 lg:table-cell">
                              <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--qs-ink)]">
                                <MethodIcon className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" aria-hidden="true" />
                                <span className="truncate">{txn.methodLabel}</span>
                              </p>
                            </td>
                            <td className="px-3 py-3.5 text-right">
                              <p className="text-[13px] font-bold tabular-nums text-[var(--qs-brand)]">+{txn.credits}</p>
                              <ExpiryLine txn={txn} now={now} />
                            </td>
                            <td className="px-3 py-3.5 text-right">
                              <p className="text-[13px] font-bold tabular-nums text-[var(--qs-ink)]">{formatINR(txn.price)}</p>
                              <p className="mt-0.5 text-[11px] text-[var(--qs-muted)]">incl. GST</p>
                            </td>
                            <td className="px-3 py-3.5">
                              <StatusChip status={txn.status} />
                            </td>
                            <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <RowActions
                                txn={txn}
                                openMenuId={openMenuId}
                                setOpenMenuId={setOpenMenuId}
                                menuRef={menuRef}
                                onReceipt={() => handleReceipt(txn)}
                                onRetry={() => handleRetry(txn)}
                                onInvoice={() => handleInvoice(txn)}
                                onCopy={() => copyOrderId(txn)}
                                onSupport={() => {
                                  setOpenMenuId(null);
                                  toast.info({ title: "Contact support", description: "Send a message through the Contact page feedback form with your order ID." });
                                }}
                                onCheck={() => toast.info({ title: "Payment pending", description: `Order ${txn.id} is still being confirmed.` })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <ul className="divide-y divide-[var(--qs-line)] sm:hidden">
                  {pageItems.map((txn) => (
                    <li key={txn.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openDrawer(txn)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            if ((e.target as HTMLElement).closest("button")) return;
                            e.preventDefault();
                            openDrawer(txn);
                          }
                        }}
                        aria-label={`Open details for ${txn.packName}, order ${txn.id}`}
                        className="cursor-pointer space-y-2 px-4 py-4 outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.05] focus-visible:bg-[var(--qs-brand)]/[0.05] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--qs-brand)]/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-[var(--qs-ink)]">{txn.packName}</p>
                          <p className="shrink-0 text-sm font-extrabold tabular-nums text-[var(--qs-ink)]">{formatINR(txn.price)}</p>
                        </div>
                        <p className="truncate text-xs tabular-nums text-[var(--qs-muted)]">
                          {fmtDateTime(txn.timestamp)} · Order #{txn.id}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-[var(--qs-brand)]/[0.08] px-2.5 py-1 text-xs font-bold tabular-nums text-[var(--qs-brand)]">
                            +{txn.credits} credits
                          </span>
                          <StatusChip status={txn.status} />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="text-xs text-[var(--qs-muted)]">
                            <ExpiryLine txn={txn} now={now} />
                            {txn.status !== "completed" && <span>{txn.methodLabel}</span>}
                          </div>
                          {txn.status === "failed" ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRetry(txn); }}
                              aria-label={`Retry payment for ${txn.packName}`}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--qs-brand)] px-3.5 py-2 text-xs font-bold text-[var(--qs-on-brand)] outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                              Retry payment
                            </button>
                          ) : txn.status === "pending" ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toast.info({ title: "Payment pending", description: `Order ${txn.id} is still being confirmed.` }); }}
                              aria-label={`Check status for ${txn.packName}`}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--qs-sun)]/60 bg-[var(--qs-sun)]/25 px-3.5 py-2 text-xs font-bold text-[var(--qs-ink)] outline-none transition-colors hover:bg-[var(--qs-sun)]/35 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
                            >
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                              Check status
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleReceipt(txn); }}
                              aria-label={`Download receipt for ${txn.packName}`}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2 text-xs font-bold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t-2 border-[var(--qs-line)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-xs tabular-nums text-[var(--qs-muted)]" aria-live="polite">
                    Showing {from}–{to} of {filtered.length}
                  </p>
                  <nav className="flex items-center gap-1.5" aria-label="Transactions pagination">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                      aria-label="Previous page"
                      className="grid h-8 w-8 place-items-center rounded-lg border-2 border-[var(--qs-line)] text-[var(--qs-muted)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {pageNumbers.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        aria-label={`Page ${n}`}
                        aria-current={n === safePage ? "page" : undefined}
                        className={cn(
                          "h-8 min-w-8 rounded-lg px-2 text-xs font-bold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40",
                          n === safePage
                            ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                            : "border-2 border-[var(--qs-line)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                      aria-label="Next page"
                      className="grid h-8 w-8 place-items-center rounded-lg border-2 border-[var(--qs-line)] text-[var(--qs-muted)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </>
            )}
          </div>
        </>
      )}

        <TxnDrawer
          txn={activeTxn}
          onClose={() => setActiveTxn(null)}
          onReceipt={handleReceipt}
          onInvoice={handleInvoice}
        />
      </div>
    </CreditValidityContext.Provider>
  );
}

/* Row actions cell (desktop): receipt / retry / check + kebab menu */
function RowActions({ txn, openMenuId, setOpenMenuId, menuRef, onReceipt, onRetry, onInvoice, onCopy, onSupport, onCheck }: {
  txn: CreditTransaction;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onReceipt: () => void;
  onRetry: () => void;
  onInvoice: () => void;
  onCopy: () => void;
  onSupport: () => void;
  onCheck: () => void;
}) {
  const menuOpen = openMenuId === txn.id;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, menuRef, setOpenMenuId]);

  return (
    <div className="flex items-center justify-end gap-1.5">
      {txn.status === "failed" ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry payment for ${txn.packName}`}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--qs-brand)] px-3 py-2 text-xs font-bold text-[var(--qs-on-brand)] outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      ) : txn.status === "pending" ? (
        <button
          type="button"
          onClick={onCheck}
          aria-label={`Check status for ${txn.packName}`}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--qs-sun)]/60 bg-[var(--qs-sun)]/25 px-3 py-2 text-xs font-bold text-[var(--qs-ink)] outline-none transition-colors hover:bg-[var(--qs-sun)]/35 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Check status
        </button>
      ) : (
        <button
          type="button"
          onClick={onReceipt}
          aria-label={`Download receipt for ${txn.packName}`}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-xs font-bold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Receipt
        </button>
      )}
      <div className="relative" ref={menuOpen ? menuRef : undefined}>
        <button
          type="button"
          onClick={() => setOpenMenuId(menuOpen ? null : txn.id)}
          aria-label={`More actions for ${txn.packName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--qs-muted)] outline-none transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div role="menu" aria-label={`Actions for order ${txn.id}`} className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] py-1 shadow-[4px_4px_0_var(--qs-sun)]">
            <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); onInvoice(); }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-[var(--qs-ink)] outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.06] hover:text-[var(--qs-brand)] focus-visible:bg-[var(--qs-brand)]/[0.06]">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Download GST invoice
            </button>
            <button type="button" role="menuitem" onClick={onCopy}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-[var(--qs-ink)] outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.06] hover:text-[var(--qs-brand)] focus-visible:bg-[var(--qs-brand)]/[0.06]">
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy order ID
            </button>
            <button type="button" role="menuitem" onClick={onSupport}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-[var(--qs-ink)] outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.06] hover:text-[var(--qs-brand)] focus-visible:bg-[var(--qs-brand)]/[0.06]">
              <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" /> Contact support
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionsPage;
