"use client";

import Link from "next/link";
import { getUserTimeZone } from "@/lib/timezone";
import { useEffect, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  Flame,
  History,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { BASIC_TRIAL_CREDITS } from "@/lib/constants";
import { formatTrialEnd, getTrialState, useMySubscription } from "@/hooks/useMySubscription";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { getBillingTransactions, type BillingTransaction } from "@/services/billing";
import { useBillingData } from "./hooks";
import { ErrorState, Skeleton, formatINR } from "./ui";
import { TrialRequestPanel } from "./TrialRequestPanel";
import { checkLowCreditWarning, useAICreditsStore } from "@/store/aiCreditsStore";
import type { AICreditPurchase, AICreditUsageEntry } from "@/types/aiCredits";

const BTN_PRI =
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2 py-2 text-[11.5px] font-semibold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--qs-sun)] sm:gap-2 sm:rounded-[12px] sm:border-2 sm:px-4 sm:py-2.5 sm:text-[13px] sm:font-bold sm:shadow-[3px_3px_0_var(--qs-sun)] sm:active:shadow-[2px_2px_0_var(--qs-sun)]";
const PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.08em]";

const METRIC_COLORS = {
  primary: "var(--qs-brand)",
  success: "var(--qs-ok)",
  warning: "var(--qs-sun)",
  info: "#2457d6",
} as const;

function CreditCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className={className}>
      <circle cx="15" cy="15" r="13.5" fill="#f6bf2f" stroke="#b87408" strokeWidth="1.5" />
      <path
        d="M15 7.5l2 4.7 5 .5-3.8 3.3 1.2 5-4.4-2.7-4.4 2.7 1.2-5L8 12.7l5-.5z"
        fill="#fff4c9"
        stroke="#c98410"
        strokeWidth=".8"
      />
    </svg>
  );
}

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
    <section className={cn("flex h-full flex-col rounded-[18px] border border-[#e4ddff] bg-white/80 p-4 shadow-[0_18px_45px_-30px_rgba(70,40,200,0.5)] backdrop-blur sm:rounded-[26px] sm:p-6", className)}>
      <header className="flex flex-wrap items-baseline justify-between gap-3 sm:items-start">
        <div className="min-w-0">
          <h2 className="qs-display text-[14px] font-bold text-[var(--qs-ink)] sm:text-[21px] sm:font-extrabold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10.5px] text-[var(--qs-muted)] sm:text-[13px]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="mt-2.5 min-h-0 flex-1 sm:mt-5">{children}</div>
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
    <article className="rounded-[14px] border border-[#e4ddff] bg-white/80 px-3 py-2.5 shadow-[0_14px_34px_-26px_rgba(70,40,200,0.5)] backdrop-blur sm:rounded-[18px] sm:px-4 sm:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-[9.5px] font-semibold text-[var(--qs-muted)] sm:gap-2 sm:text-[10px] sm:font-black sm:uppercase sm:tracking-[0.11em]">
          <span className="hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block" style={{ background: color }} />
          <span className="truncate">{label}</span>
        </p>
        <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-[#e4ddff] bg-[#f7f5ff] text-[var(--qs-muted)] sm:grid">
          {icon}
        </span>
      </div>
      <p className="qs-display mt-0.5 text-[20px] font-bold leading-6 tracking-tight text-[var(--qs-ink)] sm:mt-2 sm:text-[30px] sm:font-extrabold sm:leading-none">
        {value}
        {unit && <span className="ml-1 text-[11px] font-medium text-[var(--qs-muted)] sm:ml-1.5 sm:text-[13px] sm:font-semibold">{unit}</span>}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-[var(--qs-muted)] sm:mt-1.5 sm:text-[12px]" title={hint}>
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
  const { subscription } = useMySubscription();
  const trialState = getTrialState(subscription);
  const isTrialActive = trialState === "active";
  const isTrialExpired = trialState === "expired";
  const activePlanId = subscription?.planSlug ?? balance.planId;
  const trialEndsOn = formatTrialEnd(subscription?.trialEnd ?? null);
  const trialPlanName = catalog.plans.find((plan) => plan.trialDays > 0)?.name ?? "Trial";
  const planName =
    catalog.plans.find((plan) => plan.slug === activePlanId)?.name ??
    (subscription?.status === "free" ? "Free plan" : "Current");

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[22px] border-2 border-[#1b1740] bg-[linear-gradient(155deg,#34268a_0%,#231a66_45%,#1b1740_100%)] p-4 !text-white shadow-[0_30px_70px_-24px_rgba(40,25,120,0.65)] sm:rounded-[26px] sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full border border-white/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-10 h-56 w-56 rounded-full bg-[#7a5cff] opacity-40 blur-3xl"
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em]",
                low
                  ? "border-[#f6bf2f]/40 bg-[#f6bf2f]/15 !text-[#f6bf2f]"
                  : "border-[#6ee7b7]/40 bg-[#6ee7b7]/15 !text-[#6ee7b7]"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {low ? "Running low" : "Available now"}
            </span>
            <h2 className="mt-2 !text-white text-[20px] font-extrabold tracking-[-0.01em] sm:text-[22px]">
              AI credit balance
            </h2>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] border border-[#f6bf2f]/40 bg-[#f6bf2f]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <CreditCoin className="h-9 w-9 drop-shadow-[0_2px_10px_rgba(246,191,47,0.5)]" />
          </span>
        </div>

        <p className="mt-3 leading-none sm:mt-4">
          <span className="text-[48px] font-black tracking-[-0.03em] !text-white sm:text-[62px]">
            {balance.totalRemaining.toLocaleString("en-IN")}
          </span>
          <span className="ml-2 align-middle text-[12px] font-semibold !text-white/70 sm:ml-2.5 sm:text-[15px]">
            credits left
          </span>
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed !text-white/70 sm:text-[13px]">
          {isTrialActive ? (
            <>
              {trialPlanName} trial · {BASIC_TRIAL_CREDITS} trial AI credits ·{" "}
              {balance.purchasedCredits.toLocaleString("en-IN")} purchased
              {trialEndsOn ? ` · ends ${trialEndsOn}` : ""}
            </>
          ) : isTrialExpired ? (
            <>
              {trialPlanName} trial expired · {BASIC_TRIAL_CREDITS} trial AI credits ·{" "}
              {balance.purchasedCredits.toLocaleString("en-IN")} purchased
              {trialEndsOn ? ` · ended ${trialEndsOn}` : ""}
            </>
          ) : (
            <>
              {planName} plan · {balance.monthlyCredits.toLocaleString("en-IN")} included ·{" "}
              {balance.purchasedCredits.toLocaleString("en-IN")} purchased
            </>
          )}
        </p>

        <div className="mt-4 sm:mt-5">
          <div className="flex items-center justify-between gap-3 text-[10.5px] font-semibold !text-white/70 sm:text-[11px]">
            <span>Monthly plan usage</span>
            <span className="tabular-nums !text-white">
              {monthlyUsed.toLocaleString("en-IN")} / {monthlyTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15 sm:h-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                low
                  ? "bg-[linear-gradient(90deg,#f6bf2f,#ffd76a)]"
                  : "bg-[linear-gradient(90deg,#8b6cff,#6ee7b7)]"
              )}
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] !text-white/55 sm:text-[11px]">
            {Math.round(monthlyPct)}% of this month&apos;s included credits used.
          </p>
        </div>

        {low && (
          <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[#f6bf2f]/40 bg-[#f6bf2f]/10 p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#f6bf2f]" />
            <p className="text-[12px] font-medium leading-5 !text-white/90">
              Running low — top up before your next paper or quiz.
            </p>
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4 sm:flex sm:flex-wrap sm:pt-5">
          <Link
            href="/creator/billing/credits"
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/20 bg-[linear-gradient(135deg,#8b6cff,#5b3fe8)] px-3.5 py-2.5 text-[12px] font-bold !text-white shadow-[0_12px_26px_-12px_rgba(123,92,255,0.9)] transition-all hover:brightness-110 sm:px-4 sm:text-[13px]"
          >
            <CreditCoin className="h-4 w-4" />
            Buy credits
          </Link>
          <Link
            href="/creator/billing/transactions"
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/25 bg-white/10 px-3.5 py-2.5 text-[12px] font-bold !text-[#1e1b4b] transition-colors hover:bg-white/15 sm:px-4 sm:text-[13px]"
          >
            <History className="h-4 w-4" />
            History
          </Link>
        </div>
      </div>
    </article>
  );
}

function toTopUp(txn: BillingTransaction): AICreditPurchase {
  const parsed = Date.parse(txn.paidAt ?? txn.createdAt);
  return {
    transactionId: txn.orderNo,
    packId: txn.orderId,
    packName:
      txn.orderType === "bundle"
        ? [txn.planName, txn.packName].filter(Boolean).join(" + ") ||
          "Plan + credit bundle"
        : txn.packName ?? "Credit pack",
    credits: txn.credits,
    price: txn.amountPaise / 100,
    timestamp: Number.isNaN(parsed) ? Date.now() : parsed,
    status: "completed",
  };
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
          <span className="grid h-12 w-12 place-items-center rounded-full border border-[#f0d28a] bg-[#fff3d1]">
            <CreditCoin className="h-7 w-7" />
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
              className={cn("flex items-center gap-2.5 py-2 sm:gap-3 sm:py-3", index > 0 && "border-t border-[var(--qs-line)] sm:border-t-2")}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-[#f0d28a] bg-[#fff3d1] sm:h-10 sm:w-10 sm:rounded-[13px]">
                <CreditCoin className="h-5 w-5 sm:h-6 sm:w-6" />
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
        <div className="flex h-[60px] flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-[var(--qs-line)] px-3 text-center sm:h-[180px] sm:rounded-2xl sm:border-2 sm:px-4">
          <p className="text-[11.5px] font-bold text-[var(--qs-ink)] sm:text-[13px]">No usage yet</p>
          <p className="mt-1 hidden max-w-[210px] text-[12px] leading-5 text-[var(--qs-muted)] sm:block">
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
        <div className="flex h-[60px] flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-[var(--qs-line)] px-3 text-center sm:h-full sm:rounded-2xl sm:border-2 sm:px-4 sm:py-8">
          <span className="hidden h-12 w-12 place-items-center rounded-full border-2 border-[var(--qs-line)] text-[var(--qs-muted)] sm:grid">
            <Flame className="h-5 w-5" />
          </span>
          <p className="text-[11.5px] font-bold text-[var(--qs-ink)] sm:mt-3 sm:text-[13px]">No AI usage yet</p>
          <p className="mt-1 hidden max-w-[210px] text-[12px] leading-5 text-[var(--qs-muted)] sm:block">
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
          <CreditCoin className="h-4 w-4" />
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
  const { subscription } = useMySubscription();
  const trialState = getTrialState(subscription);
  const isTrialActive = trialState === "active";
  const isTrialExpired = trialState === "expired";
  const isTrial = isTrialActive || (!subscription && planId === "free");
  const activePlanId = subscription?.planSlug ?? planId;
  const trialEndsOn = formatTrialEnd(subscription?.trialEnd ?? null);
  const plan = catalog.plans.find((candidate) => candidate.slug === activePlanId);
  const trialPlanName = catalog.plans.find((candidate) => candidate.trialDays > 0)?.name ?? "Trial";
  if (!isTrial && !isTrialExpired && !plan) return null;

  return (
    <section
      aria-label="Monthly plan summary"
      className="flex items-center gap-2.5 rounded-[16px] border border-[#e4ddff] bg-white/85 px-3 py-2.5 shadow-[0_14px_35px_-28px_rgba(70,40,200,0.5)] backdrop-blur sm:flex-wrap sm:justify-between sm:gap-4 sm:rounded-[22px] sm:px-5 sm:py-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] border border-[#f0d28a] bg-[#fff3d1] sm:h-11 sm:w-11 sm:rounded-[14px]">
          <CreditCoin className="h-5 w-5 sm:h-7 sm:w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <span className={cn(PILL, "text-[var(--qs-brand)]")}>Current plan</span>
          <p className="mt-0.5 truncate text-[12.5px] font-bold text-[var(--qs-ink)] sm:mt-1.5 sm:text-[15px] sm:font-extrabold">
            {isTrialActive
              ? `${trialPlanName} trial`
              : isTrialExpired
                ? `${trialPlanName} trial expired`
                : plan?.name}
            {isTrialActive && trialEndsOn ? (
              <span className="ml-1.5 font-semibold text-[var(--qs-muted)]">
                · ends {trialEndsOn}
              </span>
            ) : null}
          </p>
          <p className="truncate text-[10.5px] text-[var(--qs-muted)] sm:hidden">
            {isTrialActive
              ? `${BASIC_TRIAL_CREDITS} trial AI credits`
              : isTrialExpired
                ? "Trial ended · upgrade for AI credits"
                : plan && plan.credits > 0
                  ? `${plan.credits.toLocaleString("en-IN")} credits / month`
                  : "No monthly credits"}
            {" · "}
            {purchasedCredits.toLocaleString("en-IN")} purchased credits
          </p>
        </div>
      </div>

      <Link
        href="/creator/billing/plans"
        className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[var(--qs-brand)] sm:hidden"
      >
        Manage plan
        <ArrowRight className="h-3 w-3" />
      </Link>

      <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-[var(--qs-muted)] sm:flex">
        <span className="inline-flex items-center gap-1.5">
          <CreditCoin className="h-3.5 w-3.5" />
          {isTrialActive
            ? `${BASIC_TRIAL_CREDITS} trial AI credits`
            : isTrialExpired
              ? "Trial ended · upgrade for AI credits"
              : plan && plan.credits > 0
                ? `${plan.credits.toLocaleString("en-IN")} credits / month`
                : "No monthly credits"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CreditCoin className="h-3.5 w-3.5" />
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
      return getBillingTransactions(20)
        .then((rows) => {
          const current = useAICreditsStore.getState();
          return {
            balance: current.balance,
            stats: current.stats,
            purchases: rows
              .filter(
                (row) =>
                  (row.orderType === "credit_pack" || row.orderType === "bundle") &&
                  row.status === "paid"
              )
              .map(toTopUp),
          };
        })
        .catch(() => ({ balance: store.balance, stats: store.stats, purchases: store.purchases }));
    },
    { demoState }
  );
  const refresh = useAICreditsStore((store) => store.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const low = data ? checkLowCreditWarning(data.balance.totalRemaining, data.balance.monthlyAllowance || data.balance.monthlyCredits || 1) : false;

  return (
    <div className="space-y-3 pb-2 sm:space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <span className={cn(PILL, "text-[#2457d6]")}>Billing</span>
          <h1 className="qs-display mt-1.5 text-[21px] font-bold leading-[26px] tracking-normal text-[var(--qs-ink)] sm:mt-2 sm:text-[34px] sm:font-extrabold sm:leading-[1.08] sm:tracking-[-0.025em] lg:text-[38px]">
            Overview
          </h1>
          <p className="mt-0.5 text-[11px] leading-[15px] text-[var(--qs-muted)] sm:mt-1.5 sm:text-[15px]">
            Track your monthly plan, AI credit balance, usage and top-ups in one place.
          </p>
        </div>
      </div>

      {state === "loading" && <BillingSkeleton />}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && <EmptyBilling />}

      {state === "ready" && data && (
        <>
          <PlanSummaryStrip planId={data.balance.planId} purchasedCredits={data.balance.purchasedCredits} />

          <TrialRequestPanel />

          <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CreditsCard balance={data.balance} low={low} />
            </div>
            <TopUpsCard purchases={data.purchases} />
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-3.5 lg:grid-cols-4">
            <MetricTile
              label="Used this month"
              value={data.stats.consumedThisMonth.toLocaleString("en-IN")}
              unit="credits"
              hint={`of ${data.balance.monthlyCredits.toLocaleString("en-IN")} included`}
              color={METRIC_COLORS.warning}
              icon={<CreditCoin className="h-4 w-4" />}
            />
            <MetricTile
              label="Used today"
              value={data.stats.consumedToday.toLocaleString("en-IN")}
              unit="credits"
              hint="Across all AI features"
              color={METRIC_COLORS.primary}
              icon={<CreditCoin className="h-4 w-4" />}
            />
            <MetricTile
              label="Avg daily usage"
              value={String(data.stats.averageDailyUsage)}
              unit="credits"
              hint="Based on the last 30 days"
              color={METRIC_COLORS.info}
              icon={<CreditCoin className="h-4 w-4" />}
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

          <div className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-3">
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
