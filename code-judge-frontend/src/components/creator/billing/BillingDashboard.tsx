"use client";

import Link from "next/link";
import { ArrowRight, Coins, Flame, PiggyBank } from "lucide-react";
import { useBillingData } from "./hooks";
import {
  BillButton,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
} from "./ui";
import { useAICreditsStore } from "@/store/aiCreditsStore";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BillingDashboard({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => {
      const store = useAICreditsStore.getState();
      return { balance: store.balance, stats: store.stats };
    },
    { demoState }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Overview"
        subtitle="Your AI credit balance and usage."
        actions={
          <>
            <BillButton variant="ghost" href="/creator/billing/transactions">
              Transactions
            </BillButton>
            <BillButton variant="primary" href="/creator/billing/credits">
              Buy Credits
            </BillButton>
          </>
        }
      />

      {state === "loading" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No credit activity yet"
          description="Buy credits to start generating with AI. Your balance and usage will appear here."
          action={<BillButton href="/creator/billing/credits">Buy Credits</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            <StatCard
              label="Available credits"
              value={data.balance.totalRemaining}
              display={String(data.balance.totalRemaining)}
              hint="Ready to use"
              accent="primary"
              icon={<Coins className="h-4 w-4" />}
            />
            <StatCard
              label="Used this month"
              value={data.stats.consumedThisMonth}
              display={String(data.stats.consumedThisMonth)}
              hint={`${data.stats.consumedToday} today`}
              accent="warning"
              icon={<Flame className="h-4 w-4" />}
            />
            <StatCard
              label="Avg daily usage"
              value={data.stats.averageDailyUsage}
              display={String(data.stats.averageDailyUsage)}
              hint={`~${data.stats.estimatedDaysRemaining} days remaining`}
              accent="success"
              icon={<PiggyBank className="h-4 w-4" />}
            />
          </div>

          <Panel
            title="Recent AI usage"
            subtitle="Latest credit-consuming operations (mock data)"
            action={
              <Link
                href="/creator/billing/credits"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-500 transition-colors hover:text-pink-600 dark:text-ai-accent"
              >
                Buy Credits
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <ul className="divide-y divide-border">
              {data.stats.recentRequests.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text-primary">
                      {entry.featureLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted">{formatTime(entry.timestamp)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-text-secondary">
                    −{entry.credits}
                  </span>
                  <StatusBadge
                    label={entry.status === "success" ? "Charged" : entry.status === "refunded" ? "Refunded" : "Failed"}
                    tone={entry.status === "success" ? "emerald" : entry.status === "refunded" ? "amber" : "rose"}
                  />
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
