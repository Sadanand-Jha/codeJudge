"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getUserTimeZone } from "@/lib/timezone";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Download,
  FileText,
  Landmark,
  LifeBuoy,
  MoreHorizontal,
  Plus,
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
import { InvoiceV2Dialog } from "./InvoiceV2Dialog";
import { useBillingData } from "./hooks";
import { BillButton, ErrorState, formatINR } from "./ui";
import { QsSelect } from "@/components/creator/problems/QsSelect";

/* ============================================
   Data — recorded credit purchases.
   Expiry = purchase date + pack validity.
   ============================================ */

export type CreditTxnStatus = "completed" | "pending" | "failed" | "refunded";
export type PayMethodKind = "UPI" | "Card" | "NetBanking" | "Wallet" | "Razorpay";

export interface CreditTransaction {
  id: string;
  orderId: string;
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

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { timeZone: getUserTimeZone(), hour: "numeric", minute: "2-digit" });
}

function fmtMonthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { timeZone: getUserTimeZone(), month: "long", year: "numeric" });
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

const STATUS_META: Record<CreditTxnStatus, { label: string }> = {
  completed: { label: "Completed" },
  pending: { label: "Pending" },
  failed: { label: "Failed" },
  refunded: { label: "Refunded" },
};

const STATUS_CHIP: Record<CreditTxnStatus, string> = {
  completed: "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  pending: "border-[var(--qs-sun)] bg-[var(--qs-sun)]/25 text-[var(--qs-ink)]",
  failed: "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]",
  refunded: "border-[var(--qs-line)] bg-[var(--qs-line)]/30 text-[var(--qs-muted)]",
};

function StatusChip({ status }: { status: CreditTxnStatus }) {
  return (
    <span className={cn("mt-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-[3px] text-[11px] font-semibold sm:mt-0.5 sm:gap-1.5 sm:border-2 sm:px-3 sm:py-1 sm:text-[12.5px] sm:font-extrabold", STATUS_CHIP[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current sm:h-[7px] sm:w-[7px]" aria-hidden="true" />
      {STATUS_META[status].label}
    </span>
  );
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
    orderId: txn.orderId,
    packId:
      txn.orderType === "bundle"
        ? txn.orderId
        : txn.packCode ?? (txn.planSlug ? `plan:${txn.planSlug}` : txn.orderId),
    packName:
      txn.orderType === "bundle"
        ? [txn.planName, txn.packName].filter(Boolean).join(" + ") ||
          "Plan + credit bundle"
        : txn.planName ?? txn.packName ?? "Credit purchase",
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
  if (exp === null) return <p className="mt-0.5 text-[10px] font-medium text-[var(--qs-muted)] sm:text-[12.5px]">Validity unavailable</p>;
  const left = daysLeft(exp, now);
  if (left < 0) return <p className="mt-0.5 text-[10px] font-bold text-[var(--qs-bad)] sm:text-[12.5px] sm:font-extrabold">Expired</p>;
  if (left <= 14) {
    return (
      <p className="mt-0.5">
        <span className="inline-flex rounded-full bg-[var(--qs-sun)]/30 px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--qs-ink)] sm:px-2 sm:text-[11.5px]">
          Expires {fmtDate(exp)}
        </span>
      </p>
    );
  }
  return <p className="mt-0.5 text-[10px] text-[var(--qs-muted)] sm:text-[12.5px] sm:font-medium">Expires {fmtDate(exp)}</p>;
}

function SummaryTile({
  label,
  value,
  hint,
  highlight = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  icon: LucideIcon;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[10px] border-[1.5px] border-[#1d1840] px-2.5 py-2 text-[#1d1840] shadow-[1px_2px_0_#1d1840] sm:rounded-[18px] sm:border-2 sm:p-3.5 sm:px-4 sm:shadow-[4px_4px_0_#1d1840]",
        highlight ? "bg-[var(--qs-sun)]" : "bg-white"
      )}
    >
      <small className={cn("flex items-center gap-1.5 text-[10px] font-semibold leading-3 sm:text-[13px] sm:font-extrabold", highlight ? "text-[#5b4a10]" : "text-[#5b5680]")}>
        <Icon className={cn("h-3.5 w-3.5 shrink-0 sm:h-[15px] sm:w-[15px]", highlight ? "text-[#1d1840]" : "text-[var(--qs-brand)]")} aria-hidden="true" />
        {label}
      </small>
      <b className="mt-0.5 block break-words text-[17px] font-bold leading-5 tracking-normal sm:mt-1.5 sm:text-[28px] sm:font-extrabold sm:leading-[1.1] sm:tracking-[-0.025em]">{value}</b>
      {hint && (
        <em className={cn("mt-0.5 hidden text-[9.5px] font-semibold not-italic sm:mt-1 sm:block sm:text-[12.5px]", highlight ? "text-[#5b4a10]" : "text-[#5b5680]")}>
          {hint}
        </em>
      )}
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
  const expiry = txnExpiry(txn, getValidity);
  return [
    "QuizSupport — Payment Receipt",
    `Order ID: ${txn.id}`,
    `Item: ${txn.packName} (${txn.credits} credits)`,
    `Amount paid: ${formatINR(txn.price)}`,
    `Payment method: ${txn.methodLabel} (${txn.methodRef})`,
    `Purchase date: ${fmtDateTime(txn.timestamp)}`,
    `Credits valid till: ${expiry ? fmtDate(expiry) : "Unavailable"}`,
    `Status: ${STATUS_META[txn.status].label}`,
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
  const base = txn.price;
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
        className="absolute inset-x-2 bottom-2 top-auto flex max-h-[88vh] flex-col overflow-hidden rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[0_24px_60px_rgba(26,18,64,0.24)] sm:inset-x-6 sm:bottom-3 sm:rounded-[26px] sm:border-2 lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-full lg:max-w-md lg:rounded-none lg:border-l-2 lg:border-t-0 lg:border-r-0 lg:border-b-0"
      >
        <div className="flex items-center justify-between border-b border-[var(--qs-line)] px-3 py-2.5 sm:border-b-2 sm:px-5 sm:py-4">
          <p className="text-[12.5px] font-bold text-[var(--qs-ink)] sm:text-[15px]">Transaction details</p>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close transaction details"
            className="grid h-7 w-7 place-items-center rounded-[7px] border border-transparent text-[var(--qs-muted)] outline-none transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 sm:h-9 sm:w-9 sm:rounded-[11px] sm:border-2"
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
          </div>

          <dl className="mt-5">
            {[
              ["Credits", `+${txn.credits}`],
              ["Order value", formatINR(base)],
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
            Invoice
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
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
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
  const mobileGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: CreditTransaction[]; spent: number }> = [];
    for (const txn of pageItems) {
      const key = `${new Date(txn.timestamp).getFullYear()}-${new Date(txn.timestamp).getMonth()}`;
      let group = groups.find((entry) => entry.key === key);
      if (!group) {
        group = { key, label: fmtMonthLabel(txn.timestamp), items: [], spent: 0 };
        groups.push(group);
      }
      group.items.push(txn);
      if (txn.status === "completed") group.spent += txn.price;
    }
    return groups;
  }, [pageItems]);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  const setFilter = <T,>(setter: (v: T) => void) => (v: string) => {
    setter(v as T);
    setPage(1);
  };

  const filterTriggerClass = "h-[36px] w-full min-w-0 rounded-[9px] border border-[var(--qs-line)] bg-[var(--qs-surface)] pl-2.5 pr-2 text-[11.5px] font-medium text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 sm:h-[42px] sm:min-w-[150px] sm:rounded-[12px] sm:border-2 sm:pl-3.5 sm:pr-3 sm:text-[14px] sm:font-extrabold";
  const buyHref = onBuyCredits ? undefined : "/creator/billing/credits";
  const buyClass = "inline-flex shrink-0 items-center gap-1 rounded-[9px] border-[1.5px] border-[#1d1840] bg-[var(--qs-sun)] px-2.5 py-2 text-[12px] font-semibold text-[#1d1840] shadow-[1px_2px_0_#1d1840] transition-transform duration-100 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:gap-2 sm:rounded-[14px] sm:border-2 sm:px-[22px] sm:py-[13px] sm:text-[15px] sm:font-extrabold sm:shadow-[0_4px_0_#1d1840] sm:active:shadow-[0_2px_0_#1d1840]";

  const handleReceipt = (txn: CreditTransaction) => {
    if (onDownloadReceipt) return onDownloadReceipt(txn);
    downloadFile(`${txn.id}-receipt.txt`, receiptText(txn, getValidity));
    toast.success({ title: "Receipt downloaded", description: `Receipt for order ${txn.id}.` });
  };

  const handleInvoice = (txn: CreditTransaction) => {
    if (onDownloadInvoice) return onDownloadInvoice(txn);
    if (txn.status !== "completed") {
      toast.info({
        title: "Invoice unavailable",
        description: "An invoice is available after the payment is completed.",
      });
      return;
    }
    setInvoiceOrderId(txn.orderId);
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
      <div className="mx-auto w-full max-w-[1040px] space-y-2.5 sm:space-y-[22px]">
        {state === "loading" && (
          <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading transactions">
            <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
          </div>
        )}

        {state === "error" && (
          <ErrorState onRetry={retry} message="Transactions could not be loaded." />
        )}

        {state !== "loading" && state !== "error" && (
          <>
            <section
              aria-label="Transactions summary"
              className="relative overflow-hidden rounded-[22px] border-[1.5px] border-[#1d1840] bg-[var(--qs-brand)] p-5 pb-4 text-white shadow-[0_5px_0_var(--qs-sun)] sm:hidden"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-[13px] font-medium text-white/75">Total spent</h1>
                  <p className="mt-0.5 text-[34px] font-bold leading-[1.15] tracking-[-0.02em]">
                    {formatINR(stats.spent)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/75">
                    {stats.count} purchase{stats.count === 1 ? "" : "s"} · {stats.credits} credits
                  </p>
                </div>
                {buyHref ? (
                  <Link
                    href={buyHref}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[12px] bg-[var(--qs-sun)] px-3.5 py-2.5 text-[13px] font-semibold text-[#3b2a00]"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Buy credits
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onBuyCredits}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[12px] bg-[var(--qs-sun)] px-3.5 py-2.5 text-[13px] font-semibold text-[#3b2a00]"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Buy credits
                  </button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="min-w-0 rounded-[14px] bg-white/15 px-2.5 py-2.5">
                  <small className="block text-[11px] text-white/70">Purchases</small>
                  <b className="mt-0.5 block text-[18px] font-semibold leading-tight">{stats.count}</b>
                </div>
                <div className="min-w-0 rounded-[14px] bg-white/15 px-2.5 py-2.5">
                  <small className="block text-[11px] text-white/70">Bought</small>
                  <b className="mt-0.5 block text-[18px] font-semibold leading-tight">+{stats.credits}</b>
                </div>
                <div className="min-w-0 rounded-[14px] bg-[var(--qs-sun)] px-2.5 py-2.5 text-[#3b2a00]">
                  <small className="block text-[11px] text-[#6b4a00]">Credits left</small>
                  <b className="mt-0.5 block text-[18px] font-semibold leading-tight">{balance.totalRemaining}</b>
                </div>
              </div>
            </section>

            <section
              aria-label="Transactions summary"
              className="relative hidden overflow-hidden rounded-[14px] border-[1.5px] border-[#1d1840] bg-[var(--qs-brand)] p-3.5 text-white shadow-[2px_3px_0_var(--qs-sun)] sm:block sm:rounded-[28px] sm:border-2 sm:p-[34px] sm:shadow-[8px_8px_0_var(--qs-sun)]"
            >
              <div aria-hidden className="pointer-events-none absolute -right-[70px] -top-[90px] hidden h-[280px] w-[280px] rounded-full bg-white/[0.08] sm:block" />
              <div className="relative flex items-center justify-between gap-2 sm:flex-wrap sm:items-end sm:gap-5">
                <div className="min-w-0">
                  <h1 className="qs-display text-[20px] font-bold leading-[26px] tracking-normal sm:text-[50px] sm:font-extrabold sm:leading-[1.02] sm:tracking-[-0.035em]">
                    Transactions
                  </h1>
                  <p className="mt-0.5 text-[10.5px] leading-[14px] text-white/80 sm:mt-2 sm:text-base sm:font-semibold">
                    Credit-pack and monthly plan payments on your account.
                  </p>
                </div>
                {buyHref ? (
                  <Link href={buyHref} className={buyClass}>Buy credits</Link>
                ) : (
                  <button type="button" onClick={onBuyCredits} className={buyClass}>Buy credits</button>
                )}
              </div>
              <div className="relative mt-2.5 grid grid-cols-2 gap-1.5 sm:mt-7 sm:gap-3.5 min-[900px]:grid-cols-4">
                <SummaryTile label="Total purchases" value={String(stats.count)} icon={ShoppingCart} />
                <SummaryTile label="Credits purchased" value={`+${stats.credits}`} icon={Coins} />
                <SummaryTile label="Total spent" value={formatINR(stats.spent)} icon={ReceiptIndianRupee} />
                <SummaryTile
                  label="Credits left"
                  value={String(balance.totalRemaining)}
                  hint={nextExpiry ? `Next expiry: ${fmtDate(nextExpiry.exp)}` : "No active credits"}
                  highlight
                  icon={Wallet}
                />
              </div>
            </section>

            {expiringSoon && (
              <div className="flex items-center gap-3 rounded-[16px] border border-[var(--qs-sun)] bg-[var(--qs-sun)]/15 px-3.5 py-3 sm:flex-row sm:justify-between sm:rounded-[18px] sm:border-2" role="status">
                <AlertTriangle className="h-5 w-5 shrink-0 text-[#b7791f]" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-[var(--qs-ink)]">
                  <b className="font-semibold">
                    {expiringSoon.t.credits} credits expire on {fmtDate(expiringSoon.exp)}.
                  </b>{" "}
                  Use them before then.
                </p>
                <a
                  href="/creator/tests/create"
                  className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[var(--qs-brand)] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 sm:text-[13px]"
                >
                  Create paper <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            )}

            <section
              aria-label="Transaction list"
              className="min-w-0 sm:overflow-hidden sm:rounded-[22px] sm:border-2 sm:border-[var(--qs-line)] sm:bg-[var(--qs-surface)]"
            >
              <div className="grid min-w-0 gap-2.5 sm:gap-3 sm:p-5">
                <label htmlFor="txn-search" className="sr-only">Search transactions</label>
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="flex h-11 flex-1 items-center gap-2 rounded-[14px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-[var(--qs-muted)] transition-colors focus-within:border-[var(--qs-brand)] sm:h-[46px] sm:gap-2.5 sm:rounded-[14px] sm:border-2 sm:px-3.5">
                    <Search className="h-4 w-4 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                    <input
                      id="txn-search"
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                      placeholder="Search by pack name or order"
                      aria-label="Search transactions"
                      className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)] sm:text-[14.5px] sm:font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={exportCsv}
                    aria-label="Export CSV"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[14px] border border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] sm:ml-auto sm:h-[42px] sm:w-auto sm:rounded-[12px] sm:border-2 sm:border-[var(--qs-ink)] sm:px-3.5 sm:text-[14px] sm:font-extrabold sm:shadow-[0_3px_0_var(--qs-ink)] sm:transition-transform sm:duration-100 sm:active:translate-y-0.5 sm:active:shadow-none sm:focus-visible:outline-none sm:focus-visible:ring-2 sm:focus-visible:ring-[var(--qs-brand)]/40"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Export CSV</span>
                  </button>
                </div>
                <div className="hidden min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
                  <div className="min-w-0">
                    <QsSelect
                      id="txn-status"
                      value={status}
                      onChange={setFilter(setStatus)}
                      ariaLabel="Filter by status"
                      triggerClassName={filterTriggerClass}
                      options={[
                        { value: "all", label: "All statuses" }, { value: "completed", label: "Completed" },
                        { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }, { value: "refunded", label: "Refunded" },
                      ]}
                    />
                  </div>
                  <div className="min-w-0">
                    <QsSelect
                      id="txn-range"
                      value={range}
                      onChange={setFilter(setRange)}
                      ariaLabel="Filter by date range"
                      triggerClassName={filterTriggerClass}
                      options={[
                        { value: "all", label: "All time" }, { value: "30d", label: "Last 30 days" },
                        { value: "3m", label: "Last 3 months" }, { value: "year", label: "This year" },
                      ]}
                    />
                  </div>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <QsSelect
                      id="txn-sort"
                      value={sort}
                      onChange={setFilter(setSort)}
                      ariaLabel="Sort transactions"
                      triggerClassName={filterTriggerClass}
                      options={[
                        { value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "amount", label: "Amount high to low" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="border-t-2 border-[var(--qs-line)] px-5 py-11 text-center">
                  <b className="block text-[18px] font-extrabold text-[var(--qs-ink)]">
                    {allTxns.length === 0 ? "No transactions yet" : "No transactions match these filters"}
                  </b>
                  <p className="mt-1 text-[14px] font-medium text-[var(--qs-muted)]">
                    {allTxns.length === 0
                      ? "Buy a credit pack or choose a monthly plan to get started."
                      : "Try a different search, status or time range."}
                  </p>
                  {allTxns.length === 0 ? (
                    buyHref ? (
                      <Link href={buyHref} className={`${buyClass} mt-3.5`}>Buy credits</Link>
                    ) : (
                      <button type="button" onClick={onBuyCredits} className={`${buyClass} mt-3.5`}>Buy credits</button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setQuery(""); setStatus("all"); setRange("all"); setSort("newest"); setPage(1); }}
                      className="mt-3.5 inline-flex h-10 items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 text-[14px] font-extrabold text-[#1d1840] shadow-[0_3px_0_#1d1840] transition-transform duration-100 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full border-collapse">
                      <caption className="sr-only">Billing transactions</caption>
                      <thead>
                        <tr className="border-y-2 border-t-[var(--qs-line)] border-b-[var(--qs-ink)] bg-[var(--qs-brand)]/[0.06]">
                          <th scope="col" className="w-[33%] px-5 py-3.5 text-left text-[13px] font-extrabold text-[var(--qs-muted)]">Transaction</th>
                          <th scope="col" className="hidden w-[13%] px-3 py-3.5 text-left text-[13px] font-extrabold text-[var(--qs-muted)] lg:table-cell">Payment method</th>
                          <th scope="col" className="w-[15%] px-3 py-3.5 text-right text-[13px] font-extrabold text-[var(--qs-muted)]">Credits</th>
                          <th scope="col" className="w-[14%] px-3 py-3.5 text-right text-[13px] font-extrabold text-[var(--qs-muted)]">Amount</th>
                          <th scope="col" className="w-[14%] px-3 py-3.5 text-left text-[13px] font-extrabold text-[var(--qs-muted)]">Status</th>
                          <th scope="col" className="px-5 py-3.5 text-right"><span className="sr-only">Actions</span></th>
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
                              className="cursor-pointer outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.04] focus-visible:bg-[var(--qs-brand)]/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--qs-brand)]/40"
                            >
                              <td className="px-5 py-4">
                                <div className="flex min-w-0 items-center gap-3.5">
                                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-line)] bg-[var(--qs-brand)]/[0.06] text-[var(--qs-brand)]" aria-hidden="true">
                                    <Coins className="h-5 w-5" />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-[16px] font-extrabold tracking-[-0.01em] text-[var(--qs-ink)]">{txn.packName}</p>
                                    <p className="mt-0.5 text-[12.5px] font-medium leading-[1.45] text-[var(--qs-muted)] [overflow-wrap:anywhere]">
                                      {fmtDateTime(txn.timestamp)}
                                      <br />Order #{txn.id}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="hidden px-3 py-4 lg:table-cell">
                                <p className="flex items-center gap-2 truncate text-[14px] font-bold text-[var(--qs-ink)]">
                                  <MethodIcon className="h-4 w-4 shrink-0 text-[var(--qs-muted)]" aria-hidden="true" />
                                  <span className="truncate">{txn.methodLabel}</span>
                                </p>
                              </td>
                              <td className="px-3 py-4 text-right">
                                <p className="text-[16px] font-extrabold tabular-nums text-[var(--qs-brand)]">+{txn.credits}</p>
                                <ExpiryLine txn={txn} now={now} />
                              </td>
                              <td className="px-3 py-4 text-right">
                                <p className="text-[16px] font-extrabold tabular-nums text-[var(--qs-ink)]">{formatINR(txn.price)}</p>
                              </td>
                              <td className="px-3 py-4">
                                <StatusChip status={txn.status} />
                              </td>
                              <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
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

                  <div className="flex flex-col gap-4 pt-4 sm:hidden">
                    {mobileGroups.map((group) => (
                      <section key={group.key} aria-label={group.label}>
                        <div className="mb-2 flex items-baseline justify-between px-0.5">
                          <b className="text-[13px] font-semibold text-[var(--qs-ink)]">{group.label}</b>
                          <span className="text-[12px] text-[var(--qs-muted)]">{formatINR(group.spent)} spent</span>
                        </div>
                        <ul className="m-0 list-none overflow-hidden rounded-[16px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-0">
                          {group.items.map((txn) => (
                            <MobileTxnRow
                              key={txn.id}
                              txn={txn}
                              open={expandedTxnId === txn.id}
                              onToggle={() => setExpandedTxnId((current) => (current === txn.id ? null : txn.id))}
                              onInvoice={() => handleInvoice(txn)}
                              onRetry={() => handleRetry(txn)}
                              onSupport={() => toast.info({ title: "Contact support", description: "Send a message through the Contact page feedback form with your order ID." })}
                              onCheck={() => toast.info({ title: "Payment pending", description: `Order ${txn.id} is still being confirmed.` })}
                            />
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--qs-line)] px-2.5 py-2.5 sm:gap-3 sm:border-t-2 sm:px-5 sm:py-3.5">
                    <p className="text-[10.5px] font-semibold tabular-nums text-[var(--qs-muted)] sm:text-[13.5px] sm:font-bold" aria-live="polite">
                      Showing {from}–{to} of {filtered.length}
                    </p>
                    <nav className="flex items-center gap-2" aria-label="Transactions pagination">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage(safePage - 1)}
                        aria-label="Previous page"
                        className="grid h-7 w-7 place-items-center rounded-[7px] border border-[var(--qs-line)] bg-[var(--qs-surface)] text-[11.5px] font-semibold text-[var(--qs-muted)] sm:h-[34px] sm:w-[34px] sm:rounded-[10px] sm:border-2 sm:text-[14px] sm:font-extrabold outline-none transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 disabled:cursor-not-allowed disabled:opacity-45"
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
                            "h-7 min-w-7 rounded-[7px] px-1.5 text-[11.5px] font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 sm:h-[34px] sm:min-w-[34px] sm:rounded-[10px] sm:px-2 sm:text-[14px] sm:font-extrabold",
                            n === safePage
                              ? "border border-[var(--qs-ink)] bg-[var(--qs-brand)] text-white sm:border-2 sm:shadow-[0_3px_0_var(--qs-ink)]"
                              : "border border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)] sm:border-2"
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
                        className="grid h-7 w-7 place-items-center rounded-[7px] border border-[var(--qs-line)] bg-[var(--qs-surface)] text-[11.5px] font-semibold text-[var(--qs-muted)] sm:h-[34px] sm:w-[34px] sm:rounded-[10px] sm:border-2 sm:text-[14px] sm:font-extrabold outline-none transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <TxnDrawer
          txn={activeTxn}
          onClose={() => setActiveTxn(null)}
          onReceipt={handleReceipt}
          onInvoice={handleInvoice}
        />

        <AnimatePresence>
          {invoiceOrderId && (
            <InvoiceV2Dialog
              orderId={invoiceOrderId}
              onClose={() => setInvoiceOrderId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </CreditValidityContext.Provider>
  );
}


/* Mobile transaction row — month-grouped, expands inline like the mobile design. */
function MobileTxnRow({ txn, open, onToggle, onInvoice, onRetry, onSupport, onCheck }: {
  txn: CreditTransaction;
  open: boolean;
  onToggle: () => void;
  onInvoice: () => void;
  onRetry: () => void;
  onSupport: () => void;
  onCheck: () => void;
}) {
  const getValidity = useCreditValidity();
  const expiry = txn.status === "completed" ? txnExpiry(txn, getValidity) : null;
  const pending = txn.status === "pending";
  const failed = txn.status === "failed";

  return (
    <li className="border-t border-[var(--qs-line)] first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "Show"} details for ${txn.packName}, order ${txn.id}`}
        className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 p-3.5 text-left outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.03] focus-visible:bg-[var(--qs-brand)]/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--qs-brand)]/40"
      >
        <span className={cn("grid h-10 w-10 place-items-center rounded-[12px] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)] transition-colors", open && "bg-[var(--qs-brand)] text-white")} aria-hidden="true">
          {pending ? <Clock className="h-5 w-5" /> : <ReceiptIndianRupee className="h-5 w-5" />}
        </span>
        <span className="block min-w-0">
          <span className="block truncate text-[14px] font-semibold text-[var(--qs-ink)]">{txn.packName}</span>
          <span className="mt-0.5 block truncate text-[12px] text-[var(--qs-muted)]">
            {fmtDate(txn.timestamp)} · {txn.methodLabel}
          </span>
          <StatusChip status={txn.status} />
        </span>
        <span className="text-right">
          <b className="block text-[15px] font-semibold tabular-nums text-[var(--qs-ink)]">{formatINR(txn.price)}</b>
          <span className="block text-[12px] font-semibold text-[var(--qs-brand)]">+{txn.credits} credits</span>
        </span>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pl-[66px]">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 rounded-[12px] bg-[var(--qs-bg)] p-3 text-[12px]">
            <dt className="text-[var(--qs-muted)]">Order</dt>
            <dd className="m-0 break-all text-right font-medium text-[var(--qs-ink)]">#{txn.id}</dd>
            <dt className="text-[var(--qs-muted)]">Time</dt>
            <dd className="m-0 text-right font-medium text-[var(--qs-ink)]">{fmtTime(txn.timestamp)}</dd>
            {expiry !== null && (
              <>
                <dt className="text-[var(--qs-muted)]">Credits expire</dt>
                <dd className="m-0 text-right font-medium text-[var(--qs-ink)]">{fmtDate(expiry)}</dd>
              </>
            )}
          </dl>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={pending ? onCheck : failed ? onRetry : onInvoice}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[12.5px] font-semibold text-white!"
            >
              {pending ? <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> : failed ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
              {pending ? "Check status" : failed ? "Retry payment" : "Invoice"}
            </button>
            <button
              type="button"
              onClick={onSupport}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-surface)] text-[12.5px] font-semibold text-[var(--qs-ink)]"
            >
              <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
              Get help
            </button>
          </div>
        </div>
      )}
    </li>
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  const measureMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 208;
    const gap = 8;
    const margin = 8;
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
    const openUp = spaceBelow < 170 && rect.top > 170;
    setMenuPosition(
      openUp
        ? { bottom: window.innerHeight - rect.top + gap, left }
        : { top: rect.bottom + gap, left }
    );
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    measureMenu();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpenMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };
    const onViewport = () => measureMenu();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
    };
  }, [menuOpen, menuRef, setOpenMenuId, measureMenu]);

  return (
    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
      {txn.status === "failed" ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry payment for ${txn.packName}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[11px] border-2 border-[var(--qs-brand)] bg-[var(--qs-brand)] px-3 text-[13px] font-extrabold text-[var(--qs-on-brand)] outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      ) : txn.status === "pending" ? (
        <button
          type="button"
          onClick={onCheck}
          aria-label={`Check status for ${txn.packName}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[11px] border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/25 px-3 text-[13px] font-extrabold text-[var(--qs-ink)] outline-none transition-colors hover:bg-[var(--qs-sun)]/35 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Check status
        </button>
      ) : (
        <button
          type="button"
          onClick={onReceipt}
          aria-label={`Download receipt for ${txn.packName}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[11px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-[13px] font-extrabold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Receipt
        </button>
      )}
      <div className="relative">
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpenMenuId(menuOpen ? null : txn.id)}
          aria-label={`More actions for ${txn.packName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="grid h-9 w-9 place-items-center rounded-[11px] border-2 border-transparent text-[var(--qs-muted)] outline-none transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
        {menuOpen && menuPosition && createPortal(
          <div className="qs-ui contents">
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Actions for order ${txn.id}`}
              style={{ top: menuPosition.top, bottom: menuPosition.bottom, left: menuPosition.left }}
              className="fixed z-[80] w-52 overflow-hidden rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] py-1 shadow-[4px_4px_0_var(--qs-sun)]"
            >
              <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); onInvoice(); }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-[var(--qs-ink)] outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.06] hover:text-[var(--qs-brand)] focus-visible:bg-[var(--qs-brand)]/[0.06]">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Download invoice
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
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

export default TransactionsPage;
