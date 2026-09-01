"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Clock,
  Calendar,
  Award,
  BarChart2,
  TrendingUp,
  Timer,
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  Download,
  ExternalLink,
  Sparkles,
  Package,
} from "lucide-react";import { cn } from "@/lib/helpers";
import ProfileSectionHeader from "./ProfileSectionHeader";
import PurchaseInvoice from "./PurchaseInvoice";
import { usePurchasesStore } from "@/store/purchasesStore";
import type { FilterKey, PurchaseStatus, PurchasedItem, SortKey, Order } from "@/store/purchasesStore";
import { deriveStatus, itemDaysRemaining, filterPurchases } from "@/store/purchasesStore";

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  active: "ACTIVE",
  expiring_soon: "EXPIRING SOON",
  expired: "EXPIRED",
  completed: "COMPLETED",
};

const STATUS_TONE: Record<PurchaseStatus, string> = {
  active: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  expiring_soon: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  expired: "border-rose-500/20 bg-rose-500/5 text-rose-400",
  completed: "border-sky-500/20 bg-sky-500/5 text-sky-400",
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "test_series", label: "TEST SERIES" },
  { key: "active", label: "ACTIVE" },
  { key: "completed", label: "COMPLETED" },
  { key: "expired", label: "EXPIRED" },
  { key: "recent", label: "RECENTLY PURCHASED" },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recent_purchase", label: "Recently purchased" },
  { value: "recent_access", label: "Recently accessed" },
  { value: "progress", label: "Progress" },
  { value: "expiry", label: "Expiry date" },
  { value: "price", label: "Price" },
];

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

const fmt = (n: number) => new Date(n).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });

function StatusChip({ status, item }: { status: PurchaseStatus; item: PurchasedItem }) {
  const days = itemDaysRemaining(item);
  const sub =
    status === "expiring_soon" && days !== null
      ? `${days} day${days === 1 ? "" : "s"} remaining`
      : status === "expired" && item.expiresAt
    ? `Access ended on ${fmt(new Date(item.expiresAt).getTime())}`
    : status === "completed"
    ? `${item.progressPct}% completed`
    : undefined;
  return (
    <span
      className={cn(
        "inline-flex flex-col items-start gap-0.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
        STATUS_TONE[status]
      )}
    >
      <span>{STATUS_LABEL[status]}</span>
      {sub && <span className="text-[9px] font-medium opacity-80">{sub}</span>}
    </span>
  );
}

function ProductThumbnail({ item }: { item: PurchasedItem }) {
  return (
    <span
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-black text-2xl text-white shadow-lg ring-1 ring-white/20 dark:ring-white/10"
      )}
    >
      {item.gradient ? <span className={cn("h-14 w-14 rounded-xl", item.gradient)} /> : <span className="rounded-xl bg-gradient-to-br from-pink-500 to-violet-600" />}
      {item.initials}
    </span>
  );
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-border", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 32, delay: 0.1 }}
        className="h-full bg-gradient-to-r from-pink-500 to-violet-600"
      />
    </div>
  );
}

function PurchasedProductCard({ item, onClick }: { item: PurchasedItem; onClick: () => void }) {
  const status = useMemo(() => deriveStatus(item), [item]);
  const days = itemDaysRemaining(item);
  const showProgress = status !== "expired";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_18px_46px_rgba(236,72,153,0.12)]"
      onClick={onClick}
      role="button"
    >
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <ProductThumbnail item={item} />
          <StatusChip status={status} item={item} />
        </div>

        <h3 className="line-clamp-1 text-sm font-bold text-text-primary">{item.name}</h3>
        <p className="line-clamp-1 text-xs text-text-secondary">
          {item.creator} · {item.exam}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Package className="h-3 w-3" /> {item.attempted}/{item.total} {item.totalLabel}
          </div>
          {status !== "expired" && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Timer className="h-3 w-3" />
              {days !== null ? `${days}d left` : "Lifetime"}
            </div>
          )}
        </div>

        {showProgress && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-text-secondary">
              <span>Progress</span>
              <span className="font-medium text-text-primary">{item.progressPct}%</span>
            </div>
            <ProgressBar value={item.progressPct} />
          </div>
        )}

        {status === "expiring_soon" && (
          <p className="mt-2 text-[11px] text-amber-400">⚠ Time to renew before access expires</p>
        )}
        {status === "expired" && item.isFree && (
          <p className="mt-2 text-[11px] text-text-muted">Free content • available in the free section</p>
        )}
      </div>

      <div className="mt-auto border-t border-border px-4 py-3 flex items-center justify-between gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {status === "completed" ? (
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(13,148,176,0.3)] transition-transform hover:scale-95"
          >
            View Results
          </button>
        ) : status === "expired" ? (
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-text-primary hover:bg-accent/5"
          >
            View Details
          </button>
        ) : (
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] transition-transform hover:scale-95"
          >
            Continue →
          </button>
        )}
        <ArrowTopRightIcon />
      </div>
    </motion.div>
  );
}

function ArrowTopRightIcon() {
  return (
    <ExternalLink className="h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
  );
}

function SummaryStat({
  value,
  label,
  icon,
  accent,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", accent)}>{icon}</span>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-text-primary">{value}</div>
        <div className="text-[11px] font-medium text-text-secondary">{label}</div>
      </div>
    </div>
  );
}

function SummaryBar() {
  const { purchases } = usePurchasesStore();
  const stats = useMemo(() => {
    const purchased = purchases.length;
    const completed = purchases.filter((i) => i.progressPct >= 100).length;
    const inProgress = purchases.filter((i) => i.progressPct > 0 && i.progressPct < 100).length;
    const totalSpent = purchases.filter((i) => !i.isFree).reduce((s, i) => s + i.price, 0);
    return { purchased, inProgress, completed, totalSpent };
  }, [purchases]);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryStat value={String(stats.purchased)} label="Purchased" icon={<ShoppingBag className="h-4 w-4 text-white" />} accent="from-pink-500 to-violet-600" />
      <SummaryStat value={String(stats.inProgress)} label="In Progress" icon={<TrendingUp className="h-4 w-4 text-white" />} accent="from-violet-500 to-indigo-500" />
      <SummaryStat value={String(stats.completed)} label="Completed" icon={<Award className="h-4 w-4 text-white" />} accent="from-sky-500 to-teal-500" />
      <SummaryStat value={`₹${stats.totalSpent.toLocaleString("en-IN")}`} label="Total Spent" icon={<ShoppingBag className="h-4 w-4 text-white" />} accent="from-amber-500 to-orange-600" />
    </div>
  );
}

function ContinueCard() {
  const { purchases } = usePurchasesStore();
  const item = useMemo(
    () =>
      purchases
        .filter((i) => i.progressPct > 0 && i.progressPct < 100 && deriveStatus(i) !== "expired")
        .sort((a, b) => b.lastActiveDate - a.lastActiveDate)[0],
    [purchases]
  );
  if (!item) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-pink-500/5 via-violet-600/5 to-transparent p-6 dark:from-pink-500/[0.04] dark:via-violet-600/[0.04]"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-600/30 blur-3xl" />
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-secondary">
        <Clock className="h-3.5 w-3.5" /> Continue where you left off
      </div>
      <h3 className="text-xl font-extrabold text-text-primary">{item.name}</h3>
      {item.lastAttemptedTest && (
        <p className="mt-1 text-sm text-text-secondary">
          Last attempted: <span className="font-medium text-text-primary">{item.lastAttemptedTest}</span>
        </p>
      )}
      {typeof item.lastAttemptedScore === "number" && (
        <p className="mt-1 text-sm">
          Score:{" "}
          <span className="font-bold text-emerald-400">{item.lastAttemptedScore}/{item.total}</span>{" "}
          <span className="text-text-muted">({item.lastAttemptedPct}%ile)</span>
        </p>
      )}
      <div className="mt-3 flex items-end gap-4">
        <span className="text-xs text-text-muted">Last active: {item.lastActive}</span>
        <button className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-transform hover:scale-95">
          Continue →
        </button>
      </div>
    </motion.div>
  );
}

function PurchaseSuccessBanner({ item }: { item: PurchasedItem }) {
  const { dismissSuccess } = usePurchasesStore();
  useEffect(() => {
    const t = setTimeout(() => dismissSuccess(), 4500);
    return () => clearTimeout(t);
  }, [dismissSuccess]);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-r from-pink-500/5 via-violet-600/5 to-transparent p-5"
    >
      <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-pink-500/25 to-violet-600/35 blur-3xl" />
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-pink-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-pink-400">Purchase successful</span>
            <span className="text-xs font-medium text-text-secondary">Order #{item.orderId}</span>
          </div>
          <h3 className="mt-1 font-bold text-text-primary">{item.name}</h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            {item.isFree ? "You now have free access." : "Your test series is now available."}
          </p>
        </div>
        <button
          onClick={dismissSuccess}
          className="rounded-lg p-1 text-text-muted hover:bg-accent/5 hover:text-text-primary"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.4)] hover:scale-95">
          Start now
        </button>
        <button
          onClick={() => {
            dismissSuccess();
            const el = document.getElementById("purchases-library");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-primary hover:bg-accent/5"
        >
          Go to My Purchases
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-border bg-card py-16"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-600/10 text-pink-400">
        <ShoppingBag className="h-9 w-9" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-text-primary">Your library is waiting.</h3>
        <p className="mt-1.5 max-w-md text-sm text-text-secondary">
          Explore test series, challenges and learning resources built to help you level up. Your
          purchased items will appear here once you buy them.
        </p>
      </div>
      <Link
        href="/tests"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] hover:scale-95"
      >
        Explore Tests →
      </Link>
    </motion.div>
  );
}

function PurchaseDetailDrawer({
  item,
  open,
  onClose,
}: {
  item: PurchasedItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;
  const status = deriveStatus(item);
  const days = itemDaysRemaining(item);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-6 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            layoutId={`purchase-${item.id}`}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="pointer-events-auto mb-8 w-full max-w-2xl rounded-3xl border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top visual + thumbnail */}
            <div className="relative h-44 overflow-hidden">
              <span
                className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  item.gradient || "from-pink-500 to-violet-600"
                )}
              />
              <div className="absolute inset-0 bg-black/25" />
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-5">
                <div className="-mb-8 ml-5 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-card text-3xl font-black text-white shadow-xl ring-2 ring-white/20">
                  {item.initials}
                </div>
                <StatusChip status={status} item={item} />
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-text-primary">{item.name}</h2>
                <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-accent/5 hover:text-text-primary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                by <span className="font-medium text-text-primary">{item.creator}</span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Stat icon={<Package className="h-3.5 w-3.5" />} label="Tests" value={`${item.attempted}/${item.total}`} />
                <Stat icon={<Award className="h-3.5 w-3.5" />} label="Average score" value={item.averageScore?.toString() ?? "—"} />
                <Stat icon={<BarChart2 className="h-3.5 w-3.5" />} label="Best score" value={item.bestScore?.toString() ?? "—"} />
                <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Average percentile" value={item.averagePercentile != null ? `${item.averagePercentile}%` : "—"} />
                {item.highestRank != null && <Stat icon={<Award className="h-3.5 w-3.5" />} label="Highest rank" value={`#${item.highestRank.toLocaleString("en-IN")}`} />}
                {item.timeSpentMins != null && <Stat icon={<Timer className="h-3.5 w-3.5" />} label="Time spent" value={`${Math.round(item.timeSpentMins / 60)}h`} />}
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <DetailRow icon={<Calendar className="h-4 w-4" />} label="Purchase date" value={formatDate(item.purchaseDate)} />
                <DetailRow
                  icon={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-[3px] font-bold text-white">₹</span>}
                  label="Price"
                  value={`${item.currency}${item.price === 0 ? "Free" : item.price.toLocaleString("en-IN")}`}
                />
                <DetailRow icon={<Package className="h-4 w-4" />} label="Payment status" value="PAID" valueTone="text-emerald-400" />
                <DetailRow icon={<ShoppingBag className="h-4 w-4" />} label="Order ID" value={item.orderId} mono />
                <DetailRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Access validity"
                  value={item.expiresAt ? `Valid until ${fmt(new Date(item.expiresAt).getTime())}` : "Lifetime access"}
                />
                {item.expiresAt && days !== null && status !== "expired" && (
                  <DetailRow icon={<Timer className="h-4 w-4" />} label="Days remaining" value={`${days} days`} />
                )}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Your progress</span>
                  <span className="font-medium text-text-primary">{item.attempted}/{item.total} {item.totalLabel}</span>
                </div>
                <ProgressBar value={item.progressPct} className="h-3" />
                <div className="mt-2 text-xs text-text-secondary">
                  {item.progressPct}% completed · {status === "completed" ? "Course complete" : "Keep going!"}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                {status === "completed" ? (
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(13,148,176,0.35)]">
                    View Results
                  </button>
                ) : (
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] hover:scale-95">
                    {status === "expired" ? "View Details" : "Continue Test Series"}
                  </button>
                )}
                <button
                  onClick={() => usePurchasesStore.getState().openInvoice(item.orderId)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-transparent px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-accent/5"
                >
                  <Download className="h-4 w-4" /> Download Invoice
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-2.5 text-center">
      <div className="mb-0.5 flex justify-center text-text-secondary">{icon}</div>
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <div className="text-sm font-bold text-text-primary">{value}</div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
  valueTone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  valueTone?: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-text-secondary">{icon}</span>
      <span className="w-36 text-xs font-medium text-text-secondary">{label}</span>
      <span className={cn("text-sm font-medium text-text-primary", mono && "font-mono", valueTone)}>{value}</span>
    </div>
  );
}

function OrderDetailsDrawer({
  order,
  open,
  onClose,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && order && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-6 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="pointer-events-auto mb-8 w-full max-w-lg rounded-3xl border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h3 className="text-lg font-bold text-text-primary">Order {order.id}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-accent/5 hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4 text-sm">
                <DetailRow icon={<Calendar className="h-4 w-4" />} label="Purchased on" value={formatDate(order.date)} />
                <DetailRow
                  icon={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-[3px] font-bold text-white">₹</span>}
                  label="Amount paid"
                  value={`₹${order.amount.toLocaleString("en-IN")}`}
                />
                <DetailRow
                  icon={<ShoppingBag className="h-4 w-4" />}
                  label="Payment status"
                  value={order.status}
                  valueTone={order.status === "PAID" ? "text-emerald-400" : "text-rose-400"}
                />
                <DetailRow icon={<ShoppingBag className="h-4 w-4" />} label="Payment method" value={order.method} />
              </div>

              <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">Items</div>
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-text-secondary">{it.name}</span>
                    <span className="font-medium text-text-primary">₹{it.amount.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-medium text-text-secondary">Total</span>
                  <span className="text-lg font-bold text-text-primary">₹{order.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                onClick={() => usePurchasesStore.getState().openInvoice(order.id)}
                className="mt-6 inline-flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-accent/5"
              >
                <Download className="h-4 w-4" /> Download Invoice (PDF)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OrderHistory() {
  const { orders, orderDetailId, openOrder, closeOrder } = usePurchasesStore();
  return (
    <div className="mt-10">
      <h3 className="text-lg font-bold text-text-primary">Order History</h3>
      <div className="mt-3 space-y-2.5">
        {orders.map((o) => {
          const item = usePurchasesStore.getState().purchases.find((p) => p.orderId === o.id);
          return (
            <div
              key={o.id}
              className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-black text-white">
                  {item?.initials ?? "ORD"}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">{o.items[0]?.name ?? o.id}</div>
                  <div className="text-xs text-text-secondary">{formatDate(o.date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden text-sm font-medium sm:inline">₹{o.amount.toLocaleString("en-IN")}</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-bold",
                    o.status === "PAID"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  )}
                >
                  {o.status}
                </span>
                <button
                  onClick={() => openOrder(o.id)}
                  className="rounded-lg p-1.5 text-text-secondary opacity-0 hover:text-text-primary hover:bg-accent/5 group-hover:opacity-100"
                  aria-label={`View order ${o.id}`}
                >
                  <EyeIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <OrderDetailsDrawer
        order={orders.find((o) => o.id === orderDetailId) ?? null}
        open={!!orderDetailId}
        onClose={closeOrder}
      />
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("recent_purchase");
  const [sortOpen, setSortOpen] = useState(false);

  const {
    purchases,
    recentPurchaseId,
    showSuccess,
    detailId,
    closeDetail,
  } = usePurchasesStore();

  const filtered = useMemo(
    () => filterPurchases(purchases, activeFilter, sort, search),
    [activeFilter, sort, search, purchases]
  );

  const successItem = useMemo(
    () => (recentPurchaseId ? purchases.find((p) => p.id === recentPurchaseId) : null) ?? null,
    [recentPurchaseId, purchases]
  );

  const activeItem = useMemo(() => (detailId ? purchases.find((p) => p.id === detailId) ?? null : null), [detailId, purchases]);

  return (
    <div className="mx-auto w-full max-w-[80%] px-6 py-8 lg:px-8 xl:px-10 bg-background">
      <ProfileSectionHeader
        title="My Purchases"
        description="Everything you've purchased, all in one place."
        icon={ShoppingBag}
        iconTone="from-[#EC4899] to-[#8B5CF6]"
      />

      {/* Success experience */}
      {showSuccess && successItem && <div className="mt-6"><PurchaseSuccessBanner item={successItem} /></div>}

      {/* Summary stats */}
      <div className="mt-6"><SummaryBar /></div>

      {/* Continue where you left off */}
      <div className="mt-8"><ContinueCard /></div>

      {/* Library */}
      <div id="purchases-library" className="mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-text-primary">Your Library</h3>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your purchases..."
              className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-pink-500/30"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all",
                activeFilter === f.key
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_2px_8px_rgba(236,72,153,0.35)]"
                  : "border border-border bg-card text-text-secondary hover:text-text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto">
            <div className="relative inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-text-primary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sort:</span>
              <button onClick={() => setSortOpen(!sortOpen)} className="capitalize">
                {SORTS.find((s) => s.value === sort)?.label ?? "Recently purchased"}
              </button>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full right-2 mt-2 w-44 origin-top-right rounded-xl border border-border bg-card shadow-[0_12px_36px_rgba(0,0,0,0.35)]"
                  >
                    {SORTS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setSort(s.value);
                          setSortOpen(false);
                        }}
                        className={cn(
                          "block w-full px-3 py-2 text-left text-xs",
                          sort === s.value
                            ? "font-bold text-pink-400"
                            : "text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((item) => (
              <PurchasedProductCard
                key={item.id}
                item={item}
                onClick={() => usePurchasesStore.getState().openDetail(item.id)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Order history */}
      <OrderHistory />

      <PurchaseDetailDrawer item={activeItem} open={!!detailId} onClose={closeDetail} />

      {/* Printable invoice */}
      <PurchaseInvoice />
    </div>
  );
}