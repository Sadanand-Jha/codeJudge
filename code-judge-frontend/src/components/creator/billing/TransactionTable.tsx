"use client";

import { motion } from "framer-motion";
import { ChevronRight, ArrowLeftRight, ShoppingBag, Layers, RotateCcw, Banknote, SlidersHorizontal, Percent } from "lucide-react";
import { cn } from "@/lib/helpers";
import { formatINR, StatusBadge, PAYOUT_STATUS_TONE, type StatusTone } from "./ui";
import type { Transaction } from "./types";

export const TXN_TYPE_META: Record<Transaction["type"], { label: string; tone: StatusTone; icon: typeof ShoppingBag }> = {
  sale: { label: "Sale", tone: "emerald", icon: ShoppingBag },
  series: { label: "Test series", tone: "violet", icon: Layers },
  refund: { label: "Refund", tone: "rose", icon: RotateCcw },
  payout: { label: "Payout", tone: "sky", icon: Banknote },
  adjustment: { label: "Adjustment", tone: "slate", icon: SlidersHorizontal },
  platform_fee: { label: "Platform fee", tone: "slate", icon: Percent },
};

export function TransactionTable({
  rows,
  onRowClick,
  empty,
}: {
  rows: Transaction[];
  onRowClick?: (t: Transaction) => void;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Gross</th>
              <th className="px-4 py-3 text-right">Fees</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="px-4 py-3">Status</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const meta = TXN_TYPE_META[t.type];
              return (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onRowClick?.(t)}
                  className={cn(
                    "border-b border-border/60 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-white/[0.03]"
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-text-secondary">{t.date}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-text-primary tabular-nums">{t.id}</p>
                    <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-text-muted">{t.product}</p>
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">{t.student}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge label={meta.label} tone={meta.tone} />
                  </td>
                  <td className={cn("px-4 py-3.5 text-right font-semibold tabular-nums", t.net < 0 ? "text-rose-500" : "text-text-primary")}>
                    {formatINR(t.gross)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs tabular-nums text-text-muted">−{formatINR(Math.abs(t.fee))}</td>
                  <td className={cn("px-4 py-3.5 text-right font-bold tabular-nums", t.net < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-300")}>
                    {formatINR(t.net)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge label={t.status} tone={(PAYOUT_STATUS_TONE[t.status] ?? "slate") as StatusTone} dot />
                  </td>
                  <td className="px-2 py-3.5">
                    <ChevronRight className="h-4 w-4 text-text-muted" />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((t, i) => {
          const meta = TXN_TYPE_META[t.type];
          const Icon = meta.icon;
          return (
            <motion.button
              key={t.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onRowClick?.(t)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-border-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{t.product}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {t.id} · {t.student} · {t.date}
                    </p>
                  </div>
                </div>
                <StatusBadge label={t.status} tone={(PAYOUT_STATUS_TONE[t.status] ?? "slate") as StatusTone} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-text-secondary">{meta.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-muted tabular-nums">−{formatINR(Math.abs(t.fee))} fees</span>
                  <span className={cn("text-sm font-bold tabular-nums", t.net < 0 ? "text-rose-500" : "text-text-primary")}>
                    {formatINR(t.net)}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function TransactionFiltersRow({
  search,
  onSearch,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[220px] flex-1">
        <ArrowLeftRight className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by student, test, transaction ID..."
          className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-9 pr-3 text-[13px] text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]"
        />
      </div>
      {children}
    </div>
  );
}