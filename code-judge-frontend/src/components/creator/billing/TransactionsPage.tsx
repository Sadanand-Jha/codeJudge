"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { getPackValidityMonths } from "@/config/aiCredits";
import { cn } from "@/lib/helpers";
import { SecureLogo } from "@/components/common/SecureLogo";
import { useBillingData } from "./hooks";
import { BillButton, EmptyState, ErrorState, PageHeader, StatCard, StatusBadge, formatINR, type StatusTone } from "./ui";

/* ============================================
   Data — store purchases enriched + samples.
   Expiry = purchase date + 3 months.
   ============================================ */

export type CreditTxnStatus = "completed" | "pending" | "failed" | "refunded";
export type PayMethodKind = "UPI" | "Card" | "NetBanking" | "Wallet";

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
}

const DAY = 86_400_000;

function at(daysAgo: number, h: number, m: number): number {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

const SAMPLE_TXNS: CreditTransaction[] = [
  {
    id: "AIC-10288", packId: "master", packName: "Master Pack", credits: 550, price: 199,
    timestamp: at(80, 11, 24), status: "completed",
    methodKind: "UPI", methodLabel: "UPI · PhonePe", methodRef: "UPI ref 428811903477",
  },
  {
    id: "AIC-10134", packId: "starting", packName: "Starting Pack", credits: 100, price: 49,
    timestamp: at(120, 18, 47), status: "completed",
    methodKind: "UPI", methodLabel: "UPI · Paytm", methodRef: "UPI ref 519003276154",
  },
  {
    id: "AIC-10543", packId: "teacher", packName: "Teacher Pack", credits: 240, price: 99,
    timestamp: at(1, 19, 15), status: "pending",
    methodKind: "UPI", methodLabel: "UPI · GPay", methodRef: "Collect request sent",
  },
  {
    id: "AIC-10539", packId: "master", packName: "Master Pack", credits: 550, price: 199,
    timestamp: at(3, 10, 2), status: "failed",
    methodKind: "Card", methodLabel: "Visa •••• 1881", methodRef: "Card ending 1881",
  },
  {
    id: "AIC-10371", packId: "starting", packName: "Starting Pack", credits: 100, price: 49,
    timestamp: at(45, 14, 36), status: "refunded",
    methodKind: "UPI", methodLabel: "UPI · BHIM", methodRef: "Refund to source",
  },
];

const KNOWN_META: Record<string, Pick<CreditTransaction, "id" | "methodKind" | "methodLabel" | "methodRef">> = {
  teacher: { id: "AIC-10492", methodKind: "UPI", methodLabel: "UPI · GPay", methodRef: "UPI ref 771204455390" },
  starting: { id: "AIC-10517", methodKind: "Card", methodLabel: "Visa •••• 4242", methodRef: "Card ending 4242" },
  master: { id: "AIC-10531", methodKind: "NetBanking", methodLabel: "HDFC NetBanking", methodRef: "HDFC Bank" },
};

function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(expiry: number, now: number): number {
  return Math.ceil((expiry - now) / DAY);
}

/** Expiry for a transaction — Starting Pack lasts 1 month, others 3. */
function txnExpiry(txn: CreditTransaction): number {
  return addMonths(txn.timestamp, getPackValidityMonths(txn.packId));
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

const METHOD_ICON: Record<PayMethodKind, LucideIcon> = {
  UPI: Smartphone,
  Card: CreditCard,
  NetBanking: Landmark,
  Wallet: Wallet,
};

function ExpiryLine({ txn, now }: { txn: CreditTransaction; now: number }) {
  if (txn.status !== "completed") return null;
  const exp = txnExpiry(txn);
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
        className="h-10 cursor-pointer appearance-none rounded-xl border border-[var(--qs-line)] bg-[var(--qs-surface)] pl-3.5 pr-9 text-[13px] font-semibold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40"
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

function receiptText(txn: CreditTransaction): string {
  const gst = txn.price - txn.price / 1.18;
  return [
    "QuizSupport — Payment Receipt",
    `Order ID: ${txn.id}`,
    `Pack: ${txn.packName} (${txn.credits} credits)`,
    `Amount paid: ${formatINR(txn.price)} (incl. 18% GST of ${formatINR(gst)})`,
    `Payment method: ${txn.methodLabel} (${txn.methodRef})`,
    `Purchase date: ${fmtDateTime(txn.timestamp)}`,
    `Credits valid till: ${fmtDate(txnExpiry(txn))}`,
    `Status: ${STATUS_META[txn.status].label}`,
  ].join("\n");
}

function invoiceText(txn: CreditTransaction): string {
  const base = txn.price / 1.18;
  const gst = txn.price - base;
  return [
    "QuizSupport — GST Invoice",
    `Order ID: ${txn.id}`,
    `Pack: ${txn.packName} (${txn.credits} credits)`,
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

  const expiry = txnExpiry(txn);
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
        className="absolute inset-x-3 bottom-3 top-auto flex max-h-[88vh] flex-col overflow-hidden rounded-3xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-2xl sm:inset-x-6 lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-full lg:max-w-md lg:rounded-none lg:border-l"
      >
        <div className="flex items-center justify-between border-b border-[var(--qs-line)] px-5 py-4">
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

          <div className="mt-4 rounded-xl border border-[var(--qs-line)] bg-[var(--qs-brand)]/[0.04] p-4">
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
              ["Pack price", formatINR(base)],
              ["GST (18%)", formatINR(gst)],
              ["Payment method", txn.methodLabel],
              [txn.methodKind === "Card" ? "Card" : "Reference", txn.methodRef],
              ["Purchase date", fmtDateTime(txn.timestamp)],
              ["Expiry date", fmtDate(expiry)],
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

          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-[var(--qs-line)] px-3.5 py-3">
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

        <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--qs-line)] px-5 py-4">
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
  const { state, data, retry } = useBillingData(
    () => [...useAICreditsStore.getState().purchases].sort((a, b) => b.timestamp - a.timestamp),
    { demoState }
  );

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [range, setRange] = useState<RangeFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [activeTxn, setActiveTxn] = useState<CreditTransaction | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<Record<string, CreditTxnStatus>>({});
  const [now] = useState(() => Date.now());
  const menuRef = useRef<HTMLDivElement>(null);

  const allTxns = useMemo<CreditTransaction[]>(() => {
    const storeRows = (data ?? []).map((p, i) => {
      const meta = KNOWN_META[p.packId];
      return {
        id: meta?.id ?? `AIC-${String(10400 + Math.floor(p.timestamp / 1000) % 899)}`,
        packId: p.packId,
        packName: p.packName,
        credits: p.credits,
        price: p.price,
        timestamp: p.timestamp,
        status: (statusOverride[`${p.packId}-${p.timestamp}-${i}`] ?? "completed") as CreditTxnStatus,
        methodKind: meta?.methodKind ?? "UPI",
        methodLabel: meta?.methodLabel ?? "UPI · GPay",
        methodRef: meta?.methodRef ?? "UPI",
      } satisfies CreditTransaction;
    });
    const samples = SAMPLE_TXNS.map((t) => ({ ...t, status: statusOverride[t.id] ?? t.status }));
    return [...storeRows, ...samples].sort((a, b) => b.timestamp - a.timestamp);
  }, [data, statusOverride]);

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
      .map((t) => ({ t, exp: addMonths(t.timestamp, 3) }))
      .filter(({ exp }) => exp > now)
      .sort((a, b) => a.exp - b.exp);
    return upcoming[0] ?? null;
  }, [completed, now]);

  const expiringSoon = useMemo(() => {
    const cands = completed
      .map((t) => ({ t, left: daysLeft(addMonths(t.timestamp, 3), now) }))
      .filter(({ left }) => left >= 0 && left <= 14)
      .sort((a, b) => a.left - b.left);
    return cands[0] ?? null;
  }, [completed, now]);

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
    downloadFile(`${txn.id}-receipt.txt`, receiptText(txn));
    toast.success({ title: "Receipt downloaded", description: `Receipt for order ${txn.id}.` });
  };

  const handleInvoice = (txn: CreditTransaction) => {
    if (onDownloadInvoice) return onDownloadInvoice(txn);
    downloadFile(`${txn.id}-gst-invoice.txt`, invoiceText(txn));
    toast.success({ title: "GST invoice downloaded", description: `Invoice for order ${txn.id}.` });
  };

  const handleRetry = (txn: CreditTransaction) => {
    if (onRetry) return onRetry(txn);
    setStatusOverride((s) => ({ ...s, [txn.id]: "pending" }));
    toast.info({ title: "Retrying payment", description: `Checking status for order ${txn.id}.` });
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
    const head = "Order ID,Pack,Credits,Amount (INR),Status,Payment method,Date,Expiry";
    const lines = filtered.map((t) =>
      [t.id, t.packName, t.credits, t.price, STATUS_META[t.status].label, t.methodLabel, fmtDateTime(t.timestamp), fmtDate(addMonths(t.timestamp, 3))]
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Transactions"
        subtitle="Every AI credit purchase on your account."
        actions={
          <BillButton variant="primary" className="shrink-0" {...buyProps}>
            Buy Credits
          </BillButton>
        }
      />

      {state === "loading" && (
        <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading transactions">
          <SecureLogo variant="mark" size={40} className="animate-pulse motion-reduce:animate-none" />
        </div>
      )}

      {state === "error" && (
        <ErrorState onRetry={retry} message="Transactions could not be loaded." />
      )}

      {(state === "empty" || (state === "ready" && allTxns.length === 0)) && (
        <EmptyState
          title="No purchases yet"
          description="Buy your first credit pack to start generating papers."
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
              display={String(balance.totalRemaining)}
              accent="info"
              icon={<Wallet className="h-[18px] w-[18px]" />}
              hint={nextExpiry ? `Next expiry: ${fmtDate(nextExpiry.exp)}` : "No active credits"}
            />
          </div>

          {/* Expiry warning */}
          {expiringSoon && (
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-[var(--qs-sun)]/60 bg-[var(--qs-sun)]/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
              <p className="flex items-start gap-2 text-[13px] font-semibold text-[var(--qs-ink)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {expiringSoon.t.credits} credits expire on {fmtDate(txnExpiry(expiringSoon.t))}. Use them before then.
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
          <div className="overflow-hidden rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-[0_6px_18px_rgba(26,18,64,0.05)]">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-[var(--qs-line)] p-4 sm:p-5">
              <div className="relative flex-1">
                <label htmlFor="txn-search" className="sr-only">Search transactions</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" aria-hidden="true" />
                <input
                  id="txn-search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search by pack name or order ID"
                  className="h-10 w-full rounded-xl border border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-3.5 text-[13px] text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] hover:border-[var(--qs-brand)]/40 focus:border-[var(--qs-brand)] focus:ring-2 focus:ring-[var(--qs-brand)]/25"
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
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--qs-line)] bg-[var(--qs-brand)]/[0.07] text-[var(--qs-muted)]" aria-hidden="true">
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
                    <caption className="sr-only">AI credit purchases</caption>
                    <thead>
                      <tr className="border-b border-[var(--qs-line)]">
                        <th scope="col" className="w-[30%] px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Transaction</th>
                        <th scope="col" className="hidden w-[14%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)] lg:table-cell">Payment method</th>
                        <th scope="col" className="w-[15%] px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Credits</th>
                        <th scope="col" className="w-[12%] px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Amount</th>
                        <th scope="col" className="w-[13%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">Status</th>
                        <th scope="col" className="w-[16%] px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--qs-line)]/70">
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
                            className="cursor-pointer outline-none transition-colors hover:bg-[var(--qs-brand)]/[0.05] focus-visible:bg-[var(--qs-brand)]/[0.05] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--qs-brand)]/40"
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
                                  toast.info({ title: "Contact support", description: "Write to support@quizsupport.in with your order ID." });
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
                <ul className="divide-y divide-[var(--qs-line)]/70 sm:hidden">
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
                <div className="flex flex-col gap-3 border-t border-[var(--qs-line)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-xs tabular-nums text-[var(--qs-muted)]" aria-live="polite">
                    Showing {from}–{to} of {filtered.length}
                  </p>
                  <nav className="flex items-center gap-1.5" aria-label="Transactions pagination">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                      aria-label="Previous page"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--qs-line)] text-[var(--qs-muted)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 disabled:cursor-not-allowed disabled:opacity-40"
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
                            : "border border-[var(--qs-line)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)]"
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
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--qs-line)] text-[var(--qs-muted)] outline-none transition-colors hover:border-[var(--qs-brand)]/40 hover:text-[var(--qs-brand)] focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40 disabled:cursor-not-allowed disabled:opacity-40"
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
          <div role="menu" aria-label={`Actions for order ${txn.id}`} className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-1 shadow-[0_16px_40px_rgba(26,18,64,0.16)]">
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
