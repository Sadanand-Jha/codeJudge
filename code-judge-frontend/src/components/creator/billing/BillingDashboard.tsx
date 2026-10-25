"use client";

import Link from "next/link";
import { getUserTimeZone } from "@/lib/timezone";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  Coins,
  CreditCard,
  Flame,
  History,
  PiggyBank,
  Sparkles,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { useBillingData } from "./hooks";
import { ErrorState, Skeleton, formatINR } from "./ui";
import { checkLowCreditWarning, useAICreditsStore } from "@/store/aiCreditsStore";
import type { AICreditPurchase, AICreditUsageEntry } from "@/types/aiCredits";

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)]";
const PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.08em]";

const METRIC_COLORS = {
  primary: "var(--qs-brand)",
  success: "var(--qs-ok)",
  warning: "var(--qs-sun)",
  info: "#2457d6",
} as const;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPurchaseDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    timeZone: getUserTimeZone(),
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DashPanel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex h-full flex-col rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="qs-display text-[21px] font-extrabold text-[var(--qs-ink)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="mt-5 min-h-0 flex-1">{children}</div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  unit,
  hint,
  color,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  color: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate">{label}</span>
        </p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)]">
          {icon}
        </span>
      </div>
      <p className="qs-display mt-2 text-[30px] font-extrabold leading-none tracking-tight text-[var(--qs-ink)]">
        {value}
        {unit && <span className="ml-1.5 text-[13px] font-semibold tracking-normal text-[var(--qs-muted)]">{unit}</span>}
      </p>
      <p className="mt-1.5 truncate text-[12px] text-[var(--qs-muted)]" title={hint}>
        {hint}
      </p>
    </article>
  );
}

function UsageStatus({ entry }: { entry: AICreditUsageEntry }) {
  const tone =
    entry.status === "success"
      ? "text-[var(--qs-ok)]"
      : entry.status === "refunded"
        ? "text-[#a85d00]"
        : "text-[var(--qs-bad)]";
  const label = entry.status === "success" ? "Charged" : entry.status === "refunded" ? "Refunded" : "Failed";

  return (
    <span className={cn(PILL, tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function CreditsCard({
  balance,
  low,
}: {
  balance: ReturnType<typeof useAICreditsStore.getState>["balance"];
  low: boolean;
}) {
  const monthlyTotal = Math.max(balance.monthlyCredits, 0);
  const monthlyUsed = Math.min(Math.max(balance.monthlyCreditsConsumed, 0), monthlyTotal || balance.monthlyCreditsConsumed);
  const monthlyPct = monthlyTotal > 0 ? Math.min(100, (monthlyUsed / monthlyTotal) * 100) : 0;
  const { catalog } = usePricingCatalog();
  const isTrial = balance.planId === "free";
  const planName =
    catalog.plans.find((plan) => plan.slug === balance.planId)?.name ?? "Current";

  return (
    <div className="relative mb-4 mr-4">
      <span aria-hidden="true" className="absolute -bottom-4 -right-4 left-4 top-4 rounded-[30px] bg-[var(--qs-sun)]" />
      <article className="relative flex h-full flex-col rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className={cn(PILL, low ? "text-[#a85d00]" : "text-[var(--qs-ok)]")}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {low ? "Running low" : "Available now"}
            </span>
            <h2 className="qs-display mt-3 text-[21px] font-extrabold text-[var(--qs-ink)]">AI credit balance</h2>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
            <Sparkles className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </div>

        <p className="mt-4 leading-none">
          <span className="qs-display text-[48px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[56px]">
            {balance.totalRemaining.toLocaleString("en-IN")}
          </span>
          <span className="ml-2.5 align-middle text-[15px] font-bold text-[var(--qs-muted)]">credits left</span>
        </p>
        <p className="mt-2 text-[13px] text-[var(--qs-muted)]">
          {isTrial ? (
            <>
              Basic trial · no monthly AI credits ·{" "}
              {balance.purchasedCredits.toLocaleString("en-IN")} purchased
            </>
          ) : (
            <>
              {planName} plan · {balance.monthlyCredits.toLocaleString("en-IN")}{" "}
              included · {balance.purchasedCredits.toLocaleString("en-IN")}{" "}
              purchased
            </>
          )}
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-[var(--qs-muted)]">
            <span>Monthly plan usage</span>
            <span className="tabular-nums text-[var(--qs-ink)]">
              {monthlyUsed.toLocaleString("en-IN")} / {monthlyTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 h-3.5 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)]">
            <div
              className={cn("h-full rounded-full transition-all duration-500", low ? "bg-[var(--qs-sun)]" : "bg-[var(--qs-brand)]")}
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--qs-muted)]">
            {Math.round(monthlyPct)}% of this month&apos;s included credits used.
          </p>
        </div>

        {low && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/20 p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-ink)]" />
            <p className="text-[12px] font-medium leading-5 text-[var(--qs-ink)]">
              Running low — top up before your next paper or quiz.
            </p>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <Link href="/creator/billing/credits" className={BTN_PRI}>
            <Coins className="h-4 w-4" />
            Buy credits
          </Link>
          <Link href="/creator/billing/transactions" className={BTN}>
            <History className="h-4 w-4" />
            History
          </Link>
        </div>
      </article>
    </div>
  );
}

function TopUpsCard({ purchases }: { purchases: AICreditPurchase[] }) {
  return (
    <DashPanel
      title="Top-ups"
      subtitle="Credits you purchased"
      action={
        <Link href="/creator/billing/transactions" className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--qs-brand)] hover:underline">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {purchases.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--qs-line)] px-4 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--qs-line)] text-[var(--qs-muted)]">
            <CreditCard className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[13px] font-bold text-[var(--qs-ink)]">No top-ups yet</p>
          <p className="mt-1 max-w-[220px] text-[12px] leading-5 text-[var(--qs-muted)]">
            Buy a pack when you need more credits for papers and quizzes.
          </p>
          <Link href="/creator/billing/credits" className={cn(BTN_PRI, "mt-4")}>
            Buy credits
          </Link>
        </div>
      ) : (
        <div>
          {purchases.slice(0, 4).map((purchase, index) => (
            <div
              key={`${purchase.packId}-${purchase.timestamp}`}
              className={cn("flex items-center gap-3 py-3", index > 0 && "border-t-2 border-[var(--qs-line)]")}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
                <Coins className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-bold text-[var(--qs-ink)]">{purchase.packName}</b>
                <small className="block text-[11px] text-[var(--qs-muted)]">{formatPurchaseDate(purchase.timestamp)}</small>
              </div>
              <div className="shrink-0 text-right">
                <b className="block text-[13px] font-extrabold tabular-nums text-[var(--qs-ink)]">+{purchase.credits}</b>
                <small className="block text-[11px] tabular-nums text-[var(--qs-muted)]">{formatINR(purchase.price)}</small>
              </div>
            </div>
          ))}
          <p className="mt-3 flex items-center gap-1.5 border-t-2 border-[var(--qs-line)] pt-3 text-[11px] text-[var(--qs-muted)]">
            <CalendarClock className="h-3.5 w-3.5" />
            Purchased credits are valid for the period shown on each pack.
          </p>
        </div>
      )}
    </DashPanel>
  );
}

function UsageChart({ graph }: { graph: Array<{ day: string; credits: number }> }) {
  const max = Math.max(...graph.map((point) => point.credits), 1);
  const middle = graph[Math.floor(graph.length / 2)];

  return (
    <DashPanel
      title="Usage over 30 days"
      subtitle="Credits consumed per day"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] px-2.5 py-1 text-[11px] font-bold text-[var(--qs-muted)]">
          Peak <b className="text-[var(--qs-ink)]">{max}</b>
        </span>
      }
    >
      {graph.length === 0 ? (
        <div className="flex h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--qs-line)] px-4 text-center">
          <p className="text-[13px] font-bold text-[var(--qs-ink)]">No usage yet</p>
          <p className="mt-1 max-w-[210px] text-[12px] leading-5 text-[var(--qs-muted)]">
            Credit consumption will appear here after your first AI generation.
          </p>
        </div>
      ) : (
        <>
      <div className="flex h-[180px] items-end gap-[3px] border-b-2 border-[var(--qs-ink)] pb-0.5">
        {graph.map((point) => (
          <div
            key={point.day}
            className="group flex h-full min-w-0 flex-1 items-end"
            title={`${point.day}: ${point.credits} credits`}
          >
            <div
              className="w-full rounded-t-[4px] bg-[var(--qs-brand)] transition-colors group-hover:bg-[var(--qs-sun)]"
              style={{ height: `${Math.max((point.credits / max) * 100, point.credits > 0 ? 4 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-[var(--qs-muted)]">
        <span>{graph[0]?.day}</span>
        <span className="hidden sm:inline">{middle?.day}</span>
        <span>Today</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[12px] font-medium text-[var(--qs-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-brand)]" />
          Daily credits
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-sun)]" />
          Hover to inspect
        </span>
      </div>
        </>
      )}
    </DashPanel>
  );
}

function RecentUsageCard({ entries }: { entries: AICreditUsageEntry[] }) {
  return (
    <DashPanel
      title="Recent AI usage"
      subtitle="Latest credit-consuming operations"
      action={
        <Link href="/creator/billing/transactions" className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--qs-brand)] hover:underline">
          All
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {entries.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--qs-line)] px-4 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--qs-line)] text-[var(--qs-muted)]">
            <Flame className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[13px] font-bold text-[var(--qs-ink)]">No AI usage yet</p>
          <p className="mt-1 max-w-[210px] text-[12px] leading-5 text-[var(--qs-muted)]">
            Generate a paper or quiz and your usage will show up here.
          </p>
        </div>
      ) : (
        <div>
          {entries.slice(0, 6).map((entry, index) => (
            <div
              key={entry.id}
              className={cn("flex items-center gap-3 py-2.5", index > 0 && "border-t-2 border-[var(--qs-line)]")}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[var(--qs-ink)]">{entry.featureLabel}</p>
                <p className="mt-0.5 text-[11px] text-[var(--qs-muted)]">{formatTime(entry.timestamp)}</p>
              </div>
              <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-[var(--qs-ink)]">
                −{entry.credits}
              </span>
              <UsageStatus entry={entry} />
            </div>
          ))}
        </div>
      )}
    </DashPanel>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="relative mb-4 mr-4 lg:col-span-2">
          <Skeleton className="h-[330px] rounded-[26px]" />
        </div>
        <Skeleton className="h-[330px] rounded-[26px]" />
      </div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-[18px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Skeleton className="h-[320px] rounded-[26px] xl:col-span-2" />
        <Skeleton className="h-[320px] rounded-[26px]" />
      </div>
    </div>
  );
}

function EmptyBilling() {
  return (
    <div className="relative mb-4 mr-4">
      <span aria-hidden="true" className="absolute -bottom-4 -right-4 left-4 top-4 rounded-[30px] bg-[var(--qs-sun)]" />
      <div className="relative rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-6 py-12 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
          <Wallet className="h-6 w-6" />
        </span>
        <h2 className="qs-display mt-4 text-[26px] font-extrabold text-[var(--qs-ink)]">No credit activity yet</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-6 text-[var(--qs-muted)]">
          Buy credits to start generating with AI. Your balance, usage and top-ups will appear here.
        </p>
        <Link href="/creator/billing/credits" className={cn(BTN_PRI, "mx-auto mt-5")}>
          <Coins className="h-4 w-4" />
          Buy credits
        </Link>
      </div>
    </div>
  );
}

function PlanSummaryStrip({
  planId,
  purchasedCredits,
}: {
  planId: string;
  purchasedCredits: number;
}) {
  const { catalog } = usePricingCatalog();
  const isTrial = planId === "free";
  const plan = catalog.plans.find((candidate) => candidate.slug === planId);
  if (!isTrial && !plan) return null;

  return (
    <section
      aria-label="Monthly plan summary"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <span className={cn(PILL, "text-[var(--qs-brand)]")}>Monthly plan</span>
          <p className="mt-1.5 truncate text-[15px] font-extrabold text-[var(--qs-ink)]">
            {isTrial ? "Basic trial" : plan?.name}
            {!isTrial && plan && plan.price > 0 && (
              <span className="ml-1.5 font-semibold text-[var(--qs-muted)]">
                · {formatINR(plan.price)} / month
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-[var(--qs-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
          {isTrial
            ? "Quizzes only · no AI credits"
            : plan && plan.credits > 0
              ? `${plan.credits.toLocaleString("en-IN")} credits / month`
              : "No monthly credits"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
          {purchasedCredits.toLocaleString("en-IN")} purchased credits
        </span>
        <Link
          href="/creator/billing/plans"
          className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[var(--qs-brand)] hover:underline"
        >
          Manage plan
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

export function BillingDashboard({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => {
      const store = useAICreditsStore.getState();
      return { balance: store.balance, stats: store.stats, purchases: store.purchases };
    },
    { demoState }
  );

  const low = data ? checkLowCreditWarning(data.balance.totalRemaining, data.balance.monthlyAllowance || data.balance.monthlyCredits || 1) : false;

  return (
    <div className="space-y-5 pb-2">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <span className={cn(PILL, "text-[#2457d6]")}>Billing</span>
          <h1 className="qs-display mt-2 text-[28px] font-extrabold leading-[1.08] tracking-[-0.025em] text-[var(--qs-ink)] sm:text-[34px] lg:text-[38px]">
            Billing overview
          </h1>
          <p className="mt-1.5 text-[14px] text-[var(--qs-muted)] sm:text-[15px]">
            Track your monthly plan, AI credit balance, usage and top-ups in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/creator/billing/plans" className={BTN}>
            <CalendarClock className="h-4 w-4" />
            Monthly plans
          </Link>
          <Link href="/creator/billing/transactions" className={BTN}>
            <History className="h-4 w-4" />
            Transactions
          </Link>
          <Link href="/creator/billing/credits" className={BTN_PRI}>
            <Coins className="h-4 w-4" />
            Buy credits
          </Link>
        </div>
      </div>

      {state === "loading" && <BillingSkeleton />}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && <EmptyBilling />}

      {state === "ready" && data && (
        <>
          <PlanSummaryStrip planId={data.balance.planId} purchasedCredits={data.balance.purchasedCredits} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CreditsCard balance={data.balance} low={low} />
            </div>
            <TopUpsCard purchases={data.purchases} />
          </div>

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <MetricTile
              label="Used this month"
              value={data.stats.consumedThisMonth.toLocaleString("en-IN")}
              unit="credits"
              hint={`of ${data.balance.monthlyCredits.toLocaleString("en-IN")} included`}
              color={METRIC_COLORS.warning}
              icon={<Flame className="h-4 w-4" />}
            />
            <MetricTile
              label="Used today"
              value={data.stats.consumedToday.toLocaleString("en-IN")}
              unit="credits"
              hint="Across all AI features"
              color={METRIC_COLORS.primary}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <MetricTile
              label="Avg daily usage"
              value={String(data.stats.averageDailyUsage)}
              unit="credits"
              hint="Based on the last 30 days"
              color={METRIC_COLORS.info}
              icon={<PiggyBank className="h-4 w-4" />}
            />
            <MetricTile
              label="Days remaining"
              value={String(data.stats.estimatedDaysRemaining)}
              unit="days"
              hint="At your current pace"
              color={METRIC_COLORS.success}
              icon={<CalendarClock className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <UsageChart graph={data.stats.monthlyGraph} />
            </div>
            <RecentUsageCard entries={data.stats.recentRequests} />
          </div>
        </>
      )}
    </div>
  );
}
