"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RotateCcw, Check, X as XIcon, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/ui/settings";
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
  IconButton,
  formatINR,
  type StatusTone,
} from "./ui";
import { ExportModal } from "./exportModal";
import { REFUNDS } from "./mockData";
import type { RefundRecord, RefundStatus } from "./types";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "Requested", label: "Requested" },
  { id: "Approved", label: "Approved" },
  { id: "Processing", label: "Processing" },
  { id: "Completed", label: "Completed" },
  { id: "Rejected", label: "Rejected" },
] as const;

const CAN_ACT_ON: RefundStatus[] = ["Requested", "Approved"];

export function RefundsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { state, data, retry } = useBillingData(() => REFUNDS as RefundRecord[], { demoState });
  const [filter, setFilter] = useState<"all" | RefundStatus>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ record: RefundRecord; action: "approve" | "reject" } | null>(null);
  const [details, setDetails] = useState<RefundRecord | null>(null);
  const [rows, setRows] = useState<RefundRecord[]>(REFUNDS);

  const filtered = useMemo(
    () => rows.filter((r) => filter === "all" || r.status === filter),
    [rows, filter]
  );

  const totalRefunded = rows
    .filter((r) => r.status === "Completed" || r.status === "Processing")
    .reduce((s, r) => s + r.amount, 0);

  const handleConfirm = () => {
    if (!confirm) return;
    const { record, action } = confirm;
    const nextStatus: RefundStatus = action === "approve" ? "Processing" : "Rejected";
    setRows((prev) => prev.map((r) => (r.id === record.id ? { ...r, status: nextStatus } : r)));
    toast[action === "approve" ? "success" : "warning"]({
      title: action === "approve" ? "Refund approved" : "Refund rejected",
      description: `${record.student} — ${formatINR(record.amount)} (${record.product})`,
    });
    setConfirm(null);
    if (details?.id === record.id) setDetails({ ...details, status: nextStatus });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refunds"
        subtitle="Manage refund requests raised by students for your products."
        badge={<MockDataTag />}
        actions={
          <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
            Export
          </BillButton>
        }
      />

      {state === "loading" && <TableSkeleton rows={6} cols={7} />}
      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && data && data.length === 0 && (
        <EmptyState
          title="No refunds yet"
          description="When students request refunds, they'll appear here for your review."
        />
      )}

      {state === "ready" && data && data.length > 0 && (
        <Panel noPadding>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <SegmentedControl value={filter} onChange={(f) => setFilter(f)} options={STATUS_FILTERS} size="md" />
            <p className="text-xs text-text-secondary">
              Active refunds{" "}
              <span className="font-bold text-text-primary tabular-nums">{formatINR(totalRefunded)}</span>
            </p>
          </div>

          <div className="hidden overflow-x-auto px-4 pb-4 md:block">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-3">Refund</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Transaction</th>
                  <th className="px-3 py-3">Reason</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-3.5">
                      <p className="font-semibold text-text-primary tabular-nums">{r.id}</p>
                      <p className="text-[11px] font-bold text-rose-500 tabular-nums">{formatINR(r.amount)}</p>
                    </td>
                    <td className="px-3 py-3.5 text-text-secondary">{r.student}</td>
                    <td className="max-w-[200px] truncate px-3 py-3.5 text-xs text-text-secondary">{r.product}</td>
                    <td className="px-3 py-3.5 text-xs tabular-nums text-text-muted">{r.transactionId}</td>
                    <td className="max-w-[180px] truncate px-3 py-3.5 text-xs text-text-secondary" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-text-muted">{r.date}</td>
                    <td className="px-3 py-3.5">
                      <StatusBadge label={r.status} tone={(PAYOUT_STATUS_TONE[r.status] ?? "slate") as StatusTone} dot />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetails(r)}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                        >
                          View
                        </button>
                        {CAN_ACT_ON.includes(r.status) && (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirm({ record: r, action: "approve" })}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                            >
                              <Check className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirm({ record: r, action: "reject" })}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-500 transition-colors hover:bg-rose-500/20"
                            >
                              <XIcon className="h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <RotateCcw className="h-4 w-4 text-rose-500" />
                      {r.id}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {r.student} · {r.product}
                    </p>
                  </div>
                  <StatusBadge label={r.status} tone={(PAYOUT_STATUS_TONE[r.status] ?? "slate") as StatusTone} dot />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[11px] text-text-muted">{r.reason}</span>
                  <span className="text-sm font-bold text-rose-500 tabular-nums">{formatINR(r.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === "approve" ? "Approve refund?" : "Reject refund?"}
        description={
          confirm
            ? `${formatINR(confirm.record.amount)} refund for ${confirm.record.student} (${confirm.record.product}). ${
                confirm.action === "approve"
                  ? "The amount will be returned to the student's original payment method."
                  : "The student will be notified and the refund will be closed."
              }`
            : ""
        }
        confirmLabel={confirm?.action === "approve" ? "Approve Refund" : "Reject Refund"}
        variant={confirm?.action === "reject" ? "danger" : "default"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* Details modal */}
      <AnimatePresence>
        {details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-text-primary">{details.id}</p>
                    <StatusBadge label={details.status} tone={(PAYOUT_STATUS_TONE[details.status] ?? "slate") as StatusTone} dot />
                  </div>
                </div>
                <IconButton label="Close" onClick={() => setDetails(null)}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <dl className="mt-5 space-y-0">
                {[
                  ["Amount", formatINR(details.amount)],
                  ["Student", details.student],
                  ["Product", details.product],
                  ["Original transaction", details.transactionId],
                  ["Reason", details.reason],
                  ["Date", details.date],
                ].map(([label, value], i, arr) => (
                  <div key={label} className={i < arr.length - 1 ? "flex items-center justify-between border-b border-border/60 py-3" : "flex items-center justify-between py-3"}>
                    <dt className="text-xs text-text-secondary">{label}</dt>
                    <dd className="text-xs font-semibold text-text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
              {CAN_ACT_ON.includes(details.status) && (
                <div className="mt-5 flex items-center gap-2.5">
                  <BillButton
                    className="flex-1"
                    icon={<Check className="h-4 w-4" />}
                    onClick={() => setConfirm({ record: details, action: "approve" })}
                  >
                    Approve
                  </BillButton>
                  <BillButton variant="danger" className="flex-1" icon={<XIcon className="h-4 w-4" />} onClick={() => setConfirm({ record: details, action: "reject" })}>
                    Reject
                  </BillButton>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}