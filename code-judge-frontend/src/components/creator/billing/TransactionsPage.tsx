"use client";

import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { useBillingData } from "./hooks";
import {
  PageHeader,
  Panel,
  BillButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  StatusBadge,
  formatINR,
} from "./ui";
import { useAICreditsStore } from "@/store/aiCreditsStore";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TransactionsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => [...useAICreditsStore.getState().purchases].sort((a, b) => b.timestamp - a.timestamp),
    { demoState }
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.packName.toLowerCase().includes(q) ||
        p.packId.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totals = useMemo(() => {
    const rows = filtered;
    return {
      count: rows.length,
      credits: rows.reduce((s, p) => s + p.credits, 0),
      spent: rows.reduce((s, p) => s + p.price, 0),
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Every AI credit purchase on your account."
        actions={
          <BillButton variant="primary" href="/creator/billing/credits">
            Buy Credits
          </BillButton>
        }
      />

      {state === "loading" && <TableSkeleton rows={6} cols={4} />}
      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && data && data.length === 0 && (
        <EmptyState
          title="No credit purchases yet"
          description="Buy your first credit pack to start generating with AI."
          action={<BillButton href="/creator/billing/credits">Buy Credits</BillButton>}
        />
      )}

      {state === "ready" && data && data.length > 0 && (
        <Panel noPadding>
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <span className="text-text-secondary">
                {totals.count} purchase{totals.count !== 1 ? "s" : ""}
              </span>
              <span className="text-text-secondary">
                Credits{" "}
                <span className="font-bold tabular-nums text-amber-500">+{totals.credits}</span>
              </span>
              <span className="text-text-secondary">
                Spent{" "}
                <span className="font-bold tabular-nums text-text-primary">{formatINR(totals.spent)}</span>
              </span>
            </div>
            <div className="relative min-w-[240px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by pack name..."
                className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-[13px] text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]"
              />
            </div>
          </div>

          <div className="px-4 pb-4">
            {filtered.length === 0 ? (
              <EmptyState
                title="No purchases match your search"
                description="Try a different search term to see more results."
              />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {filtered.map((p, i) => (
                  <li key={`${p.packId}-${p.timestamp}-${i}`} className="flex items-center gap-3 bg-card px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                      <Coins className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-text-primary">
                        {p.packName}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-text-muted">
                        {formatTime(p.timestamp)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-amber-500">
                      +{p.credits}
                    </span>
                    <span className="hidden w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-text-secondary sm:block">
                      {formatINR(p.price)}
                    </span>
                    <StatusBadge label="Completed" tone="emerald" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
