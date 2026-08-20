"use client";

import { useState } from "react";
import { ShoppingCart, ReceiptIndianRupee, Percent, UserCheck, UserPlus } from "lucide-react";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatCard,
  StatCardSkeleton,
  SegmentedControl,
  BillButton,
  EmptyState,
  ErrorState,
  DeltaPill,
  formatINR,
} from "./ui";
import { EarningsAreaChart, SalesBarChart, BreakdownDonut, ProductRevenueList } from "./charts";
import {
  EARNINGS_LAST_10_DAYS,
  EARNINGS_LAST_30_DAYS,
  EARNINGS_BREAKDOWN,
  FEE_BREAKDOWN,
  SALES_METRICS,
  TOP_PRODUCTS,
  MONTHLY_SUMMARY,
} from "./mockData";
import type { BillingMetricKey } from "./types";

const METRIC_ICONS = [ShoppingCart, ReceiptIndianRupee, Percent, UserCheck, UserPlus];
const RANGE_OPTIONS = [
  { id: "7", label: "Last 7 days" },
  { id: "10", label: "Last 10 days" },
  { id: "30", label: "Last 30 days" },
];

export function EarningsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, retry } = useBillingData(() => ({ ok: true }), { demoState });
  const [range, setRange] = useState("10");
  const [metric, setMetric] = useState<BillingMetricKey>("earnings");

  const chartData =
    range === "7" ? EARNINGS_LAST_10_DAYS.slice(3) : range === "30" ? EARNINGS_LAST_30_DAYS : EARNINGS_LAST_10_DAYS;
  const total = chartData.reduce((s, d) => s + d.earnings, 0);
  const breakdownTotal = EARNINGS_BREAKDOWN.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings"
        subtitle="Revenue analytics, sales performance and where your money comes from."
        badge={<MockDataTag />}
        actions={<BillButton variant="ghost" href="/creator/billing/transactions">View transactions</BillButton>}
      />

      {state === "loading" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      {state === "error" && <ErrorState onRetry={retry} />}
      {state === "empty" && (
        <EmptyState
          title="No sales data yet"
          description="Your earnings analytics will appear here once students start buying your tests."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && (
        <>
          {/* Sales metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {SALES_METRICS.map((m, i) => {
              const Icon = METRIC_ICONS[i] ?? ShoppingCart;
              return (
                <StatCard
                  key={m.label}
                  label={m.label}
                  value={m.value}
                  display={m.display}
                  delta={m.deltaPct}
                  accent="info"
                  icon={<Icon className="h-4 w-4" />}
                />
              );
            })}
          </div>

          {/* Earnings chart */}
          <Panel
            title="Earnings Trend"
            subtitle={`${formatINR(total)} in the selected window`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl value={range} onChange={setRange} options={RANGE_OPTIONS} />
                <SegmentedControl
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { id: "earnings", label: "Earnings" },
                    { id: "sales", label: "Sales" },
                    { id: "refunds", label: "Refunds" },
                  ]}
                />
              </div>
            }
          >
            {metric === "sales" ? (
              <SalesBarChart data={chartData} metric="sales" height={280} />
            ) : (
              <EarningsAreaChart data={chartData} metric={metric} height={280} />
            )}
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Breakdown */}
            <Panel title="Earnings Breakdown" className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <BreakdownDonut data={EARNINGS_BREAKDOWN} total={breakdownTotal} />
                <div className="space-y-2.5">
                  {EARNINGS_BREAKDOWN.map((cat) => {
                    const pct = Math.round((cat.amount / breakdownTotal) * 100);
                    return (
                      <div key={cat.id}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-text-secondary">{cat.label}</span>
                          <span className="font-bold text-text-primary tabular-nums">{formatINR(cat.amount)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-3 rounded-lg border border-border bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-secondary">Gross revenue</span>
                      <span className="font-bold text-text-primary tabular-nums">{formatINR(FEE_BREAKDOWN.gross)}</span>
                    </div>
                    <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">Website fee (12.5%)</span>
                        <span className="tabular-nums text-text-secondary">−{formatINR(FEE_BREAKDOWN.platformFee)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">GST on revenue (18%)</span>
                        <span className="tabular-nums text-text-secondary">−{formatINR(FEE_BREAKDOWN.gst)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">Processing & refunds</span>
                        <span className="tabular-nums text-text-secondary">−{formatINR(FEE_BREAKDOWN.processingFee + FEE_BREAKDOWN.refunds + FEE_BREAKDOWN.taxes)}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                      <span className="text-sm font-bold text-text-primary">Net earnings</span>
                      <span className="text-sm font-bold text-emerald-500 tabular-nums">{formatINR(FEE_BREAKDOWN.net)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Top products */}
            <Panel title="Revenue by Product" subtitle="Top selling tests & series">
              <ProductRevenueList items={TOP_PRODUCTS} total={TOP_PRODUCTS.reduce((s, p) => s + p.revenue, 0)} />
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                <span className="text-xs font-medium text-text-secondary">Aug vs Jul</span>
                <DeltaPill pct={MONTHLY_SUMMARY.deltaPct} tone="good" />
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}