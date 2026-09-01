"use client";

import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  SegmentedControl,
  BillButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  DateRangePicker,
  formatINR,
} from "./ui";
import { TransactionTable } from "./TransactionTable";
import { TransactionDrawer } from "./transactionDrawer";
import { ExportModal } from "./exportModal";
import { TRANSACTIONS } from "./mockData";
import type { Transaction, TransactionType } from "./types";

type TxFilter = "all" | TransactionType;

const FILTERS: Array<{ id: TxFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "sale", label: "Test purchase" },
  { id: "series", label: "Test series" },
  { id: "refund", label: "Refund" },
  { id: "payout", label: "Payout" },
  { id: "adjustment", label: "Adjustment" },
  { id: "platform_fee", label: "Platform fee" },
];

export function TransactionsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => TRANSACTIONS as Transaction[],
    { demoState }
  );
  const [filter, setFilter] = useState<TxFilter>("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("10d");
  const [exportOpen, setExportOpen] = useState(false);
  const [activeTxn, setActiveTxn] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (!q) return true;
      return (
        t.student.toLowerCase().includes(q) ||
        t.product.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [data, filter, search]);

  const totals = useMemo(() => {
    const sales = filtered.filter((t) => t.net > 0 && t.type !== "payout");
    const gross = sales.reduce((s, t) => s + t.gross, 0);
    const fees = sales.reduce((s, t) => s + t.fee, 0);
    const net = sales.reduce((s, t) => s + t.net, 0);
    return { gross, fees, net };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Complete ledger of every financial movement on your account."
        badge={<MockDataTag />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
              Export
            </BillButton>
            <BillButton variant="ghost" icon={<FileText className="h-4 w-4" />} href="/creator/billing/documents">
              Documents
            </BillButton>
          </>
        }
      />

      {state === "loading" && <TableSkeleton rows={8} cols={8} />}
      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && data && data.length === 0 && (
        <EmptyState
          title="No transactions yet"
          description="Once students purchase your tests, your transactions will appear here."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && data && data.length > 0 && (
        <Panel noPadding>
          {/* Filters */}
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={FILTERS}
              size="md"
              className="overflow-x-auto"
            />
            <div className="relative min-w-[240px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student, test, transaction ID..."
                className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-[13px] text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]"
              />
            </div>
          </div>

          {/* Totals bar */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border bg-white/[0.02] px-4 py-3 text-xs">
            <span className="text-text-secondary">
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
            </span>
            <span className="text-text-secondary">
              Gross <span className="font-bold text-text-primary tabular-nums">{formatINR(totals.gross)}</span>
            </span>
            <span className="text-text-secondary">
              Fees <span className="font-bold text-text-primary tabular-nums">−{formatINR(totals.fees)}</span>
            </span>
            <span className="text-text-secondary">
              Net <span className="font-bold text-emerald-500 tabular-nums">{formatINR(totals.net)}</span>
            </span>
          </div>

          <div className="p-4">
            {filtered.length === 0 ? (
              <EmptyState
                title="No transactions match your filters"
                description="Try adjusting your search or filters to see more results."
              />
            ) : (
              <TransactionTable rows={filtered} onRowClick={setActiveTxn} />
            )}
          </div>
        </Panel>
      )}

      <TransactionDrawer transaction={activeTxn} onClose={() => setActiveTxn(null)} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}