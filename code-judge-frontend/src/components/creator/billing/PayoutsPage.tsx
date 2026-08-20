"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye, Banknote, Plus } from "lucide-react";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatusBadge,
  PAYOUT_STATUS_TONE,
  SegmentedControl,
  BillButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  formatINR,
  type StatusTone,
} from "./ui";
import { WithdrawDrawer } from "./withdraw";
import { ExportModal } from "./exportModal";
import { PAYOUTS, BANK_ACCOUNTS } from "./mockData";
import type { Payout, PayoutStatus } from "./types";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "Completed", label: "Completed" },
  { id: "Processing", label: "Processing" },
  { id: "Pending", label: "Pending" },
  { id: "Failed", label: "Failed" },
  { id: "Cancelled", label: "Cancelled" },
] as const;

export function PayoutsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(() => PAYOUTS as Payout[], { demoState });
  const [filter, setFilter] = useState<"all" | PayoutStatus>("all");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = useMemo(
    () => (data ?? []).filter((p) => filter === "all" || p.status === filter),
    [data, filter]
  );

  const lifetime = PAYOUTS.filter((p) => p.status === "Completed").reduce((s, p) => s + p.netAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        subtitle="Money transferred from your earnings balance to your bank account."
        badge={<MockDataTag />}
        actions={
          <>
            <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
              Export
            </BillButton>
            <BillButton icon={<Plus className="h-4 w-4" />} onClick={() => setWithdrawOpen(true)}>
              Withdraw
            </BillButton>
          </>
        }
      />

      {state === "loading" && <TableSkeleton rows={7} cols={8} />}
      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && data && data.length === 0 && (
        <EmptyState
          title="No payouts yet"
          description="Withdraw your earnings whenever you're ready — payouts appear here."
          action={<BillButton onClick={() => setWithdrawOpen(true)}>Withdraw Money</BillButton>}
        />
      )}

      {state === "ready" && data && data.length > 0 && (
        <Panel noPadding>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <SegmentedControl value={filter} onChange={(f) => setFilter(f)} options={STATUS_FILTERS} size="md" />
            <p className="text-xs text-text-secondary">
              Lifetime withdrawn{" "}
              <span className="font-bold text-text-primary tabular-nums">{formatINR(lifetime)}</span>
            </p>
          </div>

          <div className="hidden overflow-x-auto px-4 pb-4 md:block">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-3">Payout ID</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Destination</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Fee</th>
                  <th className="px-3 py-3 text-right">Net</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-3.5 font-semibold text-text-primary tabular-nums">{p.id}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-text-secondary">{p.date}</td>
                    <td className="px-3 py-3.5 text-right font-bold text-text-primary tabular-nums">{formatINR(p.amount)}</td>
                    <td className="px-3 py-3.5 text-xs text-text-secondary">{p.destination}</td>
                    <td className="px-3 py-3.5">
                      <StatusBadge label={p.status} tone={(PAYOUT_STATUS_TONE[p.status] ?? "slate") as StatusTone} dot />
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs tabular-nums text-text-muted">−{formatINR(p.fee)}</td>
                    <td className="px-3 py-3.5 text-right font-bold text-emerald-600 tabular-nums dark:text-emerald-300">
                      {formatINR(p.netAmount)}
                    </td>
                    <td className="px-3 py-3.5 text-xs tabular-nums text-text-muted">{p.referenceId}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Receipt
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary tabular-nums">{p.id}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">{p.date}</p>
                  </div>
                  <StatusBadge label={p.status} tone={(PAYOUT_STATUS_TONE[p.status] ?? "slate") as StatusTone} dot />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-text-muted" />
                    <span className="text-xs text-text-secondary">{p.destination}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary tabular-nums">{formatINR(p.netAmount)}</p>
                    <p className="text-[10px] text-text-muted tabular-nums">ref {p.referenceId}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <WithdrawDrawer open={withdrawOpen} onClose={() => setWithdrawOpen(false)} accounts={BANK_ACCOUNTS} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}