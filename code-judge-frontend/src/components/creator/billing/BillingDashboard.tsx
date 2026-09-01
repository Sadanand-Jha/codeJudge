"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Banknote,
  ArrowUpRight,
  Download,
  FileText,
  Settings2,
  ShoppingBag,
  Layers,
  Sparkles,
  Target,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  MockDataTag,
  SecureNote,
  StatCard,
  StatCardSkeleton,
  PanelSkeleton,
  Panel,
  formatINR,
  SegmentedControl,
  DateRangePicker,
  BillButton,
  EmptyState,
  ErrorState,
  DeltaPill,
} from "./ui";
import { EarningsAreaChart, BreakdownDonut } from "./charts";
import { TransactionTable } from "./TransactionTable";
import { TransactionDrawer } from "./transactionDrawer";
import { WithdrawDrawer } from "./withdraw";
import { ExportModal } from "./exportModal";
import {
  OVERVIEW_STATS,
  EARNINGS_LAST_10_DAYS,
  EARNINGS_TOTAL_LAST_10,
  EARNINGS_DELTA_LAST_10,
  EARNINGS_BREAKDOWN,
  FEE_BREAKDOWN,
  WALLET,
  MONTHLY_SUMMARY,
  INSIGHTS,
  TRANSACTIONS,
  BANK_ACCOUNTS,
} from "./mockData";
import type { BillingMetricKey, Transaction } from "./types";

const INSIGHT_TONE: Record<string, string> = {
  positive: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  neutral: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  attention: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  opportunity: "text-violet-500 bg-violet-500/10 border-violet-500/20",
};

const BREAKDOWN_ICONS = [ShoppingBag, Layers, Sparkles, Target];

export function BillingDashboard({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, retry } = useBillingData(() => ({ ok: true }), { demoState });
  const [metric, setMetric] = useState<BillingMetricKey>("earnings");
  const [range, setRange] = useState("10d");
  const [exportOpen, setExportOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [activeTxn, setActiveTxn] = useState<Transaction | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const breakdownTotal = EARNINGS_BREAKDOWN.reduce((s, b) => s + b.amount, 0);
  const recentTxns = TRANSACTIONS.slice(0, 6);
  // Mobile: show only 7d for revenue over time
  const earningsData = isMobile ? EARNINGS_LAST_10_DAYS.slice(-7) : EARNINGS_LAST_10_DAYS;
  const earningsTotal = earningsData.reduce((s, d) => s + d.earnings, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Billing & Payments"
        subtitle="Track your earnings, payouts, transactions and financial activity."
        badge={<MockDataTag />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
              Export
            </BillButton>
            <BillButton variant="ghost" icon={<FileText className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
              Download statement
            </BillButton>
            <BillButton variant="ghost" icon={<Settings2 className="h-4 w-4" />} href="/creator/billing/settings">
              Payment settings
            </BillButton>
          </>
        }
      />

      <SecureNote text={`Last financial activity: ${WALLET.lastActivity}`} />

      {state === "loading" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <PanelSkeleton title="Earnings — Last 10 Days" />
            <PanelSkeleton title="Earnings Breakdown" />
          </div>
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No financial data yet"
          description="Once students purchase your tests, your earnings and transactions will appear here."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && (
        <>
          {/* 1. Earnings overview — 2 per line on mobile */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {OVERVIEW_STATS.map((s) => (
              <StatCard
                key={s.id}
                label={s.label}
                value={s.value}
                display={s.display}
                delta={s.deltaPct}
                hint={s.hint}
                accent={s.accent}
              />
            ))}
          </div>

          {/* 2. Last 10 days earnings — mobile shows 7d */}
          <Panel
            className="overflow-hidden"
            title={isMobile ? "Earnings — Last 7 Days" : "Earnings — Last 10 Days"}
            subtitle={`${formatINR(earningsTotal)} earned in the last ${isMobile ? "7" : "10"} days`}
            action={
              <div className="flex flex-col items-end gap-2">
                <SegmentedControl
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { id: "earnings", label: "Earnings" },
                    { id: "sales", label: "Sales" },
                    { id: "refunds", label: "Refunds" },
                  ]}
                />
                <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <DeltaPill pct={EARNINGS_DELTA_LAST_10} tone="good" />
                  vs previous {isMobile ? "7" : "10"} days
                </span>
              </div>
            }
          >
            <EarningsAreaChart
              data={earningsData}
              metric={metric}
              height={280}
              comparePrev={metric === "earnings"}
            />
          </Panel>

          {/* 3. Breakdown + Wallet */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Earnings breakdown */}
            <Panel title="Earnings Breakdown" subtitle="Where your money came from">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <BreakdownDonut data={EARNINGS_BREAKDOWN} total={breakdownTotal} />
                <div className="space-y-2.5">
                  {EARNINGS_BREAKDOWN.map((cat, i) => {
                    const Icon = BREAKDOWN_ICONS[i] ?? Target;
                    const pct = Math.round((cat.amount / breakdownTotal) * 100);
                    return (
                      <div key={cat.id} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-text-secondary">{cat.label}</p>
                            <p className="text-xs font-bold text-text-primary tabular-nums">{formatINR(cat.amount)}</p>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="w-8 text-right text-[11px] font-semibold text-text-muted tabular-nums">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gross vs Net */}
              <div className="mt-5 rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-secondary">Gross revenue</span>
                  <span className="font-bold text-text-primary tabular-nums">{formatINR(FEE_BREAKDOWN.gross)}</span>
                </div>
                {[
                  ["Website fee (12.5%)", FEE_BREAKDOWN.platformFee],
                  ["GST on revenue (18%)", FEE_BREAKDOWN.gst],
                  ["Payment processing", FEE_BREAKDOWN.processingFee],
                  ["Refunds", FEE_BREAKDOWN.refunds],
                  ["Taxes / adjustments", FEE_BREAKDOWN.taxes],
                ].map(([label, val]) => (
                  <div key={label as string} className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-text-muted">{label}</span>
                    <span className="tabular-nums text-text-secondary">−{formatINR(val as number)}</span>
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-bold text-text-primary">Net earnings</span>
                  <span className="text-sm font-bold text-emerald-500 tabular-nums">{formatINR(FEE_BREAKDOWN.net)}</span>
                </div>
              </div>
            </Panel>

            {/* Wallet */}
            <Panel title="Wallet" subtitle="Your available balance and payout position">
              <div className="rounded-xl border border-border bg-gradient-to-br from-pink-500/[0.06] to-violet-600/[0.06] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Available to withdraw
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-text-primary tabular-nums">
                  {formatINR(WALLET.available)}
                </p>
                <p className="mt-1 text-[11px] text-text-secondary">Available for withdrawal</p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <BillButton icon={<Banknote className="h-4 w-4" />} onClick={() => setWithdrawOpen(true)}>
                    Withdraw Money
                  </BillButton>
                  <BillButton variant="ghost" href="/creator/billing/payouts">
                    View Payouts
                  </BillButton>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Pending", value: WALLET.pending, hint: "₹8,200 settlement due" },
                  { label: "Processing", value: WALLET.processing },
                  { label: "Lifetime withdrawn", value: WALLET.lifetimeWithdrawn },
                  { label: "Next payout", value: null, hint: WALLET.nextPayoutDate },
                ].map((row) => (
                  <div key={row.label} className="rounded-xl border border-border bg-card-hover p-3.5">
                    <p className="text-[11px] text-text-muted">{row.label}</p>
                    <p className="mt-1 text-lg font-bold text-text-primary tabular-nums">
                      {row.value === null ? "—" : formatINR(row.value)}
                    </p>
                    {row.hint && <p className="mt-0.5 text-[10px] text-text-muted">{row.hint}</p>}
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* 4. Insights + Monthly summary — monthly full width */}
          <div className="grid grid-cols-1 gap-6">
            <Panel title="Financial Insights" subtitle="Auto-generated from your data" className="col-span-full">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INSIGHTS.map((ins) => (
                  <motion.div
                    key={ins.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn("rounded-xl border p-4", INSIGHT_TONE[ins.tone])}
                  >
                    <div className="flex items-center gap-2">
                      {ins.tone === "positive" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : ins.tone === "opportunity" ? (
                        <Lightbulb className="h-4 w-4" />
                      ) : ins.tone === "attention" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <p className="text-xs font-bold text-text-primary">{ins.title}</p>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{ins.description}</p>
                  </motion.div>
                ))}
              </div>
            </Panel>

            <Panel title={MONTHLY_SUMMARY.monthLabel} subtitle="Monthly financial summary">
              <div className="space-y-3">
                {[
                  ["Gross revenue", MONTHLY_SUMMARY.grossRevenue, false],
                  ["Fees", MONTHLY_SUMMARY.fees, false],
                  ["Refunds", MONTHLY_SUMMARY.refunds, false],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{label}</span>
                    <span className="font-semibold tabular-nums text-text-primary">
                      {formatINR(val as number)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-bold text-text-primary">Net earnings</span>
                  <span className="text-sm font-bold text-emerald-500 tabular-nums">
                    {formatINR(MONTHLY_SUMMARY.netEarnings)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Sales</span>
                  <span className="font-semibold tabular-nums text-text-primary">{MONTHLY_SUMMARY.sales}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Average order</span>
                  <span className="font-semibold tabular-nums text-text-primary">
                    {formatINR(MONTHLY_SUMMARY.averageOrder)}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
                <DeltaPill pct={MONTHLY_SUMMARY.deltaPct} tone="good" />
                <span className="text-[11px] text-text-secondary">vs July</span>
              </div>
            </Panel>
          </div>

          {/* 5. Recent transactions */}
          <Panel
            title="Recent Transactions"
            subtitle="Latest financial activity across your products"
            action={
              <Link
                href="/creator/billing/transactions"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-500 transition-colors hover:text-pink-600 dark:text-ai-accent"
              >
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <TransactionTable rows={recentTxns} onRowClick={setActiveTxn} />
          </Panel>
        </>
      )}

      {/* Drawers & modals */}
      <TransactionDrawer transaction={activeTxn} onClose={() => setActiveTxn(null)} />
      <WithdrawDrawer open={withdrawOpen} onClose={() => setWithdrawOpen(false)} accounts={BANK_ACCOUNTS} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}