"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, User, Flag, ReceiptText } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { formatINR, IconButton, StatusBadge, PAYOUT_STATUS_TONE, BillButton, type StatusTone } from "./ui";
import type { Transaction } from "./types";

const TXN_TYPE_LABEL: Record<Transaction["type"], string> = {
  sale: "Sale",
  series: "Test series",
  refund: "Refund",
  payout: "Payout",
  adjustment: "Adjustment",
  platform_fee: "Platform fee",
};

export function TransactionDrawer({
  transaction,
  onClose,
}: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const toast = useToast();

  if (!transaction) return null;

  const actionFeedback = (label: string) =>
    toast.info({ title: label });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-2 bottom-2 top-auto flex max-h-[88vh] flex-col overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:border-0 sm:border-l"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction details"
        >
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2.5">
              <ReceiptText className="h-4 w-4 text-pink-500 dark:text-ai-accent" />
              <p className="text-[12.5px] font-bold text-text-primary sm:text-[15px]">Transaction Details</p>
            </div>
            <IconButton label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3 sm:px-6 sm:py-5">
            {/* Status header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">Transaction ID</p>
                <p className="text-sm font-bold text-text-primary tabular-nums">{transaction.id}</p>
              </div>
              <StatusBadge label={transaction.status} tone={(PAYOUT_STATUS_TONE[transaction.status] ?? "slate") as StatusTone} dot />
            </div>

            <div className="mt-2.5 rounded-[10px] border border-border bg-white/[0.03] p-2.5 sm:mt-4 sm:rounded-xl sm:p-4">
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-text-secondary sm:text-[11px]">Amount</p>
              <p className="mt-0.5 text-[18px] font-bold tracking-tight text-text-primary tabular-nums sm:mt-1 sm:text-2xl">
                {formatINR(transaction.net)}
              </p>
            </div>

            {/* Detail rows */}
            <dl className="mt-2.5 space-y-0 sm:mt-5">
              {[
                ["Date", transaction.date],
                ["Student", transaction.student],
                ["Product", transaction.product],
                ["Type", TXN_TYPE_LABEL[transaction.type]],
                ["Payment method", transaction.paymentMethod],
                ["Gross amount", formatINR(transaction.gross)],
                ["Platform fee", `−${formatINR(Math.abs(transaction.fee))}`],
                ["Payment processing", "Included in fee"],
                ["Net earnings", formatINR(transaction.net)],
              ].map(([label, value], i, arr) => (
                <div
                  key={label}
                  className={cnRow(i, arr.length, label === "Net earnings")}
                >
                  <dt className="text-[10px] text-text-secondary sm:text-xs">{label}</dt>
                  <dd className={label === "Net earnings" ? "text-[12px] font-bold text-emerald-500 sm:text-sm" : "text-[10px] font-semibold text-text-primary sm:text-xs"}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-2.5 rounded-[10px] border border-emerald-500/20 bg-emerald-500/[0.06] p-2.5 sm:mt-4 sm:rounded-xl sm:p-3">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">Completed</p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                Funds were credited to your available balance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t border-border px-3.5 py-2.5 sm:gap-2.5 sm:px-6 sm:py-4">
            <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => actionFeedback("Receipt download")}>
              Download receipt
            </BillButton>
            <BillButton variant="ghost" icon={<FileText className="h-4 w-4" />} onClick={() => actionFeedback("View test")}>
              View test
            </BillButton>
            <BillButton variant="ghost" icon={<User className="h-4 w-4" />} onClick={() => actionFeedback("View student")}>
              View student
            </BillButton>
            <BillButton variant="outline" icon={<Flag className="h-4 w-4" />} onClick={() => actionFeedback("Report issue")}>
              Report issue
            </BillButton>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}

function cnRow(i: number, total: number, highlighted: boolean): string {
  return [
    "flex items-center justify-between border-b border-border/60 px-0 py-1.5 last:border-0 sm:py-3",
    highlighted && "bg-emerald-500/[0.05] -mx-2 px-2 rounded-lg",
  ]
    .filter(Boolean)
    .join(" ");
}