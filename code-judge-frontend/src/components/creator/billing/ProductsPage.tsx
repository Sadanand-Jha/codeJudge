"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ShoppingBag, Layers, Sparkles } from "lucide-react";
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
  DeltaPill,
  formatINR,
} from "./ui";
import { PRODUCTS } from "./mockData";
import type { ProductRevenue } from "./types";

const TYPE_FILTERS = [
  { id: "all", label: "All products" },
  { id: "test", label: "Tests" },
  { id: "series", label: "Test series" },
  { id: "assessment", label: "Assessments" },
] as const;

const TYPE_ICON = { test: ShoppingBag, series: Layers, assessment: Sparkles };

export function ProductsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(() => PRODUCTS as ProductRevenue[], { demoState });
  const [filter, setFilter] = useState<"all" | "test" | "series" | "assessment">("all");

  const filtered = useMemo(
    () => (data ?? []).filter((p) => filter === "all" || p.type === filter),
    [data, filter]
  );

  const totals = useMemo(
    () => ({
      gross: filtered.reduce((s, p) => s + p.grossRevenue, 0),
      net: filtered.reduce((s, p) => s + p.netRevenue, 0),
      sales: filtered.reduce((s, p) => s + p.sales, 0),
    }),
    [filtered]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Revenue performance for every monetized test and series."
        badge={<MockDataTag />}
        actions={<BillButton variant="ghost" href="/creator/tests/create">Create a Test</BillButton>}
      />

      {state === "loading" && <TableSkeleton rows={7} cols={7} />}
      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && data && data.length === 0 && (
        <EmptyState
          title="No products yet"
          description="Publish a paid test or series to start tracking revenue."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && data && data.length > 0 && (
        <Panel noPadding>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <SegmentedControl value={filter} onChange={(f) => setFilter(f)} options={TYPE_FILTERS} size="md" />
            <div className="flex items-center gap-5 text-xs">
              <span className="text-text-secondary">
                Gross <span className="font-bold text-text-primary tabular-nums">{formatINR(totals.gross)}</span>
              </span>
              <span className="text-text-secondary">
                Net <span className="font-bold text-emerald-500 tabular-nums">{formatINR(totals.net)}</span>
              </span>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto px-4 pb-4 md:block">
            <table className="w-full min-w-[880px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Sales</th>
                  <th className="px-3 py-3 text-right">Gross</th>
                  <th className="px-3 py-3 text-right">Refunds</th>
                  <th className="px-3 py-3 text-right">Net revenue</th>
                  <th className="px-3 py-3 text-right">Conversion</th>
                  <th className="px-3 py-3 text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const Icon = TYPE_ICON[p.type];
                  const positive = p.trendPct >= 0;
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate font-semibold text-text-primary">{p.name}</p>
                            <p className="text-[11px] capitalize text-text-muted">{p.type.replace("_", " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right font-semibold text-text-primary tabular-nums">{formatINR(p.price)}</td>
                      <td className="px-3 py-4 text-right tabular-nums text-text-secondary">{p.sales.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-4 text-right font-semibold tabular-nums text-text-primary">{formatINR(p.grossRevenue)}</td>
                      <td className="px-3 py-4 text-right text-xs tabular-nums text-text-muted">−{formatINR(p.refunds)}</td>
                      <td className="px-3 py-4 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-300">
                        {formatINR(p.netRevenue)}
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums text-text-secondary">{p.conversion}%</td>
                      <td className="px-3 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums">
                          {positive ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                          <span className={positive ? "text-emerald-500" : "text-rose-500"}>
                            {positive ? "+" : "−"}
                            {Math.abs(p.trendPct)}%
                          </span>
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {filtered.map((p) => {
              const Icon = TYPE_ICON[p.type];
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-secondary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{p.name}</p>
                        <p className="text-[11px] text-text-muted">
                          {formatINR(p.price)} · {p.sales.toLocaleString("en-IN")} sales
                        </p>
                      </div>
                    </div>
                    <DeltaPill pct={p.trendPct} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <div>
                      <p className="text-[10px] text-text-muted">Gross</p>
                      <p className="text-xs font-bold text-text-primary tabular-nums">{formatINRCompact(p.grossRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Net</p>
                      <p className="text-xs font-bold text-emerald-500 tabular-nums">{formatINRCompact(p.netRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Conversion</p>
                      <p className="text-xs font-bold text-text-primary tabular-nums">{p.conversion}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function formatINRCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (abs >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  if (abs >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}