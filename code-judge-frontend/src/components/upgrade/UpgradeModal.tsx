"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Coins, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useMySubscription } from "@/hooks/useMySubscription";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import {
  formatPricingAmount,
  type PricingCreditPack,
  type PricingPlan,
} from "@/services/pricing";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import {
  UPGRADE_MODAL_EVENT,
  type UpgradeModalDetail,
  type UpgradeModalTab,
} from "@/lib/upgradePrompt";

type UpgradeTab = UpgradeModalTab;

type AccessReason =
  | "checking"
  | "plan_required"
  | "credits_exhausted"
  | "feature_locked"
  | "ready"
  | "unknown";

const DEFAULT_TITLE = "Upgrade to keep generating with AI";
const DEFAULT_TITLE_ACCENT = "AI";

function AnimatedTitle({
  title,
  accent,
}: {
  title: string;
  accent?: string;
}) {
  if (!accent) return <>{title}</>;
  const index = title.toLowerCase().indexOf(accent.toLowerCase());
  if (index === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, index)}
      <span className="qs-color-word">{title.slice(index, index + accent.length)}</span>
      {title.slice(index + accent.length)}
    </>
  );
}

function PackCard({
  pack,
  selected,
  onSelect,
}: {
  pack: PricingCreditPack;
  selected: boolean;
  onSelect: () => void;
}) {
  const popular = pack.popular;
  const months = pack.validityMonths;

  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-1.5 rounded-[20px] border-2 border-[var(--qs-ink)] p-5 pt-6 transition-[transform,box-shadow]",
        popular
          ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
          : "bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]",
        selected && "-translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0_var(--qs-sun)]"
      )}
    >
      <input
        type="radio"
        name="upgrade-credit-pack"
        value={pack.id}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      {popular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--qs-ink)] px-3 py-[3px] text-[11px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-bg)]">
          Best value
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "absolute right-3.5 top-3.5 grid h-6 w-6 place-items-center rounded-full border-2 border-current",
          selected
            ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]"
            : "text-transparent"
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
      </span>
      <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] opacity-80">
        {pack.name}
      </span>
      <span className="flex items-baseline gap-1 text-[38px] font-extrabold leading-none tracking-[-0.03em]">
        {formatPricingAmount(pack.price)}
      </span>
      <span className="text-[15px] font-bold">
        {pack.credits.toLocaleString("en-IN")} AI credits
      </span>
      <ul
        className={cn(
          "mt-2 grid gap-2 border-t-2 pt-3 text-[13px]",
          popular ? "border-white/35" : "border-[var(--qs-line)]"
        )}
      >
        <li className="flex items-start gap-2">
          <Check
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              popular ? "text-[var(--qs-sun)]" : "text-[var(--qs-ok)]"
            )}
            strokeWidth={3}
          />
          <span className="font-bold">Use on any plan</span>
        </li>
        <li className="flex items-start gap-2">
          <Check
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              popular ? "text-[var(--qs-sun)]" : "text-[var(--qs-ok)]"
            )}
            strokeWidth={3}
          />
          <span>
            Valid for {months} month{months === 1 ? "" : "s"}
          </span>
        </li>
        {pack.blurb && (
          <li className="flex items-start gap-2">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                popular ? "text-[var(--qs-sun)]" : "text-[var(--qs-ok)]"
              )}
              strokeWidth={3}
            />
            <span>{pack.blurb}</span>
          </li>
        )}
      </ul>
    </label>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PricingPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  const featured = plan.featured;
  const features = plan.features.slice(0, 4);

  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-1.5 rounded-[20px] border-2 border-[var(--qs-ink)] p-5 pt-6 transition-[transform,box-shadow]",
        featured
          ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
          : "bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]",
        selected && "-translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0_var(--qs-sun)]"
      )}
    >
      <input
        type="radio"
        name="upgrade-monthly-plan"
        value={plan.slug}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      {featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--qs-ink)] px-3 py-[3px] text-[11px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-bg)]">
          Most popular
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "absolute right-3.5 top-3.5 grid h-6 w-6 place-items-center rounded-full border-2 border-current",
          selected
            ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]"
            : "text-transparent"
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
      </span>
      <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] opacity-80">
        {plan.name}
      </span>
      <span className="flex items-baseline gap-1 text-[38px] font-extrabold leading-none tracking-[-0.03em]">
        {formatPricingAmount(plan.price, plan.currency)}
        <small className="text-[13px] font-semibold tracking-normal opacity-75">
          /mo
        </small>
      </span>
      <span className="text-[15px] font-bold">
        {plan.credits.toLocaleString("en-IN")} AI credits / month
      </span>
      <ul
        className={cn(
          "mt-2 grid gap-2 border-t-2 pt-3 text-[13px]",
          featured ? "border-white/35" : "border-[var(--qs-line)]"
        )}
      >
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                featured ? "text-[var(--qs-sun)]" : "text-[var(--qs-ok)]"
              )}
              strokeWidth={3}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </label>
  );
}

function UpgradeModalContent({
  detail,
  onClose,
}: {
  detail: UpgradeModalDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const { catalog, isLoading, error, refresh } = usePricingCatalog();
  const {
    subscription,
    isLoading: subscriptionLoading,
    refresh: refreshSubscription,
  } = useMySubscription();
  const balance = useAICreditsStore((state) => state.balance);
  const refreshCredits = useAICreditsStore((state) => state.refresh);
  const [creditsSyncing, setCreditsSyncing] = useState(true);
  const [tab, setTab] = useState<UpgradeTab | null>(detail.tab ?? null);
  const [packId, setPackId] = useState<string | null>(null);
  const [planSlug, setPlanSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void refreshCredits().finally(() => {
      if (!cancelled) setCreditsSyncing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshCredits]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const accessChecking = subscriptionLoading || creditsSyncing;
  const hasPaidPlan =
    subscription?.isPaid === true && subscription.status !== "trialing";
  const isTrialing = subscription?.status === "trialing";
  const totalRemaining = Math.max(0, balance.totalRemaining);
  const monthlyRemaining = Math.max(
    0,
    balance.monthlyCredits - balance.monthlyCreditsConsumed
  );
  const purchasedRemaining = Math.max(
    0,
    balance.purchasedCredits - balance.purchasedCreditsConsumed
  );
  const requiredCredits = Math.max(0, detail.requiredCredits ?? 0);
  const creditShortfall =
    requiredCredits > 1 && requiredCredits > totalRemaining
      ? requiredCredits - totalRemaining
      : 0;

  let reason: AccessReason;
  if (accessChecking) {
    reason = "checking";
  } else if (!subscription) {
    reason = "unknown";
  } else if (!hasPaidPlan) {
    reason = "plan_required";
  } else if (
    totalRemaining <= 0 ||
    detail.code === "NO_AI_CREDITS" ||
    creditShortfall > 0
  ) {
    reason = "credits_exhausted";
  } else if (
    detail.code === "FEATURE_LOCKED" ||
    detail.code === "MONTHLY_PLAN_REQUIRED"
  ) {
    reason = "feature_locked";
  } else {
    reason = "ready";
  }

  const activePlan = catalog.plans.find(
    (plan) => plan.slug === subscription?.planSlug
  );
  const planLabel = accessChecking
    ? "Checking access"
    : hasPaidPlan
      ? subscription?.planName ?? activePlan?.name ?? "Active plan"
      : isTrialing
        ? "Free trial"
        : subscription
          ? "Free plan"
          : "Plan unknown";

  const reasonTitle =
    reason === "plan_required"
      ? "Monthly plan required"
      : reason === "credits_exhausted"
        ? "Not enough AI credits"
        : reason === "feature_locked"
          ? "Not included in your plan"
          : reason === "unknown"
            ? "Access could not be verified"
            : null;

  const reasonMessage = (() => {
    switch (reason) {
      case "checking":
        return "Checking your current plan and AI credit balance…";
      case "unknown":
        return (
          detail.message ??
          "We couldn't verify your plan or credit balance. Retry, or choose an option below."
        );
      case "plan_required": {
        if (purchasedRemaining > 0) {
          return `You have ${purchasedRemaining.toLocaleString(
            "en-IN"
          )} purchased AI credits, but AI tools need an active monthly plan. Your credits stay valid and are used as soon as a plan is active.`;
        }
        if (isTrialing) {
          return "AI tools need a paid monthly plan. Choose a plan to keep generating after the trial.";
        }
        return "AI tools need an active monthly plan. Every monthly plan includes AI credits each billing cycle.";
      }
      case "credits_exhausted": {
        if (creditShortfall > 0) {
          return `This action needs ${requiredCredits.toLocaleString(
            "en-IN"
          )} credits and you have ${totalRemaining.toLocaleString(
            "en-IN"
          )} left. Top up a pack or move to a bigger plan.`;
        }
        if (detail.code === "NO_AI_CREDITS" && detail.message) {
          return detail.message;
        }
        if (monthlyRemaining <= 0 && balance.monthlyCredits > 0) {
          return `You have used all ${balance.monthlyCredits.toLocaleString(
            "en-IN"
          )} AI credits included in your ${planLabel} plan. Top up instantly or upgrade for a larger monthly allowance.`;
        }
        return "You don't have enough AI credits for this action. Top up instantly or upgrade for a larger monthly allowance.";
      }
      case "feature_locked":
        return (
          detail.message ??
          `This AI feature isn't included in your ${planLabel} plan. Choose a plan that unlocks it.`
        );
      default:
        return (
          detail.message ??
          "Your plan and credits are active. Choose an option below to add more."
        );
    }
  })();

  const hasPurchasedCredits = balance.purchasedCredits > 0;
  const showCreditPacks =
    accessChecking || hasPaidPlan || !hasPurchasedCredits;
  const showMonthlyPlans = accessChecking || !hasPaidPlan;
  const availableTabs = (
    [
      { id: "credits", label: "AI credits", icon: Coins },
      { id: "plans", label: "Monthly plans", icon: Sparkles },
    ] as const
  ).filter((option) =>
    option.id === "credits" ? showCreditPacks : showMonthlyPlans
  );

  const recommendedTab: UpgradeTab =
    reason === "credits_exhausted"
      ? "credits"
      : reason === "plan_required" || reason === "feature_locked"
        ? "plans"
        : "credits";
  const preferredTab: UpgradeTab = tab ?? detail.tab ?? recommendedTab;
  const effectiveTab: UpgradeTab =
    preferredTab === "credits" && showCreditPacks
      ? "credits"
      : preferredTab === "plans" && showMonthlyPlans
        ? "plans"
        : showMonthlyPlans
          ? "plans"
          : "credits";

  const coveringPlan =
    creditShortfall > 0
      ? [...catalog.plans]
          .sort((a, b) => a.price - b.price)
          .find((plan) => plan.credits >= creditShortfall)
      : undefined;
  const recommendedPlan =
    coveringPlan ??
    catalog.plans.find((plan) => plan.featured) ??
    catalog.plans[0] ??
    null;
  const selectedPlan =
    catalog.plans.find((plan) => plan.slug === planSlug) ?? recommendedPlan;

  const coveringPack =
    creditShortfall > 0
      ? [...catalog.creditPacks]
          .sort((a, b) => a.price - b.price)
          .find((pack) => pack.credits >= creditShortfall)
      : undefined;
  const recommendedPack =
    coveringPack ??
    catalog.creditPacks.find((pack) => pack.popular) ??
    catalog.creditPacks[0] ??
    null;
  const selectedPack =
    catalog.creditPacks.find((pack) => pack.id === packId) ?? recommendedPack;

  const retryAccess = () => {
    void refreshSubscription();
    setCreditsSyncing(true);
    void refreshCredits().finally(() => setCreditsSyncing(false));
  };

  const title = detail.title ?? DEFAULT_TITLE;
  const titleAccent = detail.title ? detail.titleAccent : DEFAULT_TITLE_ACCENT;
  const description =
    detail.description ??
    (accessChecking
      ? "Checking what your account already includes so we only show what you need."
      : showMonthlyPlans && !showCreditPacks
        ? "You already have AI credits. Choose a monthly plan to start using them with AI tools."
        : showCreditPacks && !showMonthlyPlans
          ? "Your plan is active. Add a one-time credit pack to keep generating right away."
          : "Pick an AI credit pack for an instant top-up, or move to a monthly plan with credits included.");

  const startCheckout = () => {
    if (effectiveTab === "credits" && selectedPack) {
      onClose();
      router.push(
        `/creator/billing/credits?pack=${encodeURIComponent(selectedPack.id)}`
      );
      return;
    }
    if (effectiveTab === "plans" && selectedPlan) {
      onClose();
      router.push(
        `/creator/billing/plans?plan=${encodeURIComponent(selectedPlan.slug)}`
      );
    }
  };

  const ctaLabel =
    effectiveTab === "credits" && selectedPack
      ? `Buy ${selectedPack.name} · ${formatPricingAmount(selectedPack.price)}`
      : effectiveTab === "plans" && selectedPlan
        ? `Upgrade to ${selectedPlan.name} · ${formatPricingAmount(
            selectedPlan.price,
            selectedPlan.currency
          )}/mo`
        : "Choose an option";

  const activeOptions =
    effectiveTab === "credits"
      ? catalog.creditPacks.length
      : catalog.plans.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[90] flex overflow-y-auto bg-[#1A1240]/60 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 28, opacity: 0, scale: 0.97, filter: "blur(10px)" }}
        animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ y: 18, opacity: 0, scale: 0.985, filter: "blur(6px)" }}
        transition={{ duration: 0.34, ease: [0.2, 0.75, 0.25, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="qs-ui qs-cinema-panel relative m-auto w-full max-w-[860px] overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] shadow-[8px_8px_0_var(--qs-sun)] sm:rounded-[24px]"
        style={{
          background: "var(--qs-surface)",
          color: "var(--qs-ink)",
          fontSize: 15,
        }}
      >
        <div className="qs-cinema-hero relative overflow-hidden border-b-2 border-[var(--qs-ink)] px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-8">
          <span aria-hidden className="qs-cinema-beam" />
          <span aria-hidden className="qs-cinema-grain" />
          <span aria-hidden className="qs-cinema-glow qs-cinema-glow-a" />
          <span aria-hidden className="qs-cinema-glow qs-cinema-glow-b" />
          <span aria-hidden className="qs-cinema-perf qs-cinema-perf-top" />
          <span aria-hidden className="qs-cinema-perf qs-cinema-perf-bottom" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade options"
            className="cursor-pointer absolute right-4 top-4 z-20 grid h-[38px] w-[38px] place-items-center rounded-[11px] border-2 border-white/25 bg-white/10 text-white transition-colors hover:border-[var(--qs-sun)] hover:bg-white/15 sm:right-6 sm:top-6 sm:h-[42px] sm:w-[42px]"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>

          <header className="relative z-10 flex items-start gap-3 pr-12 sm:items-center sm:gap-4 sm:pr-14">
            <div className="grid h-11 w-11 flex-none place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240] shadow-[3px_3px_0_rgba(0,0,0,0.35)]">
              <Sparkles className="h-[22px] w-[22px]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="qs-cinema-eyebrow flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em]">
                <span aria-hidden className="qs-cinema-dot" />
                Now showing · {detail.eyebrow ?? "AI features"}
              </div>
              <h2
                id="upgrade-modal-title"
                className="qs-cinema-title mt-1.5 text-[24px] font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-[32px]"
              >
                <AnimatedTitle title={title} accent={titleAccent} />
              </h2>
              <p className="qs-cinema-copy mt-1.5 text-[13px] leading-5 sm:text-sm">
                {description}
              </p>
            </div>
          </header>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.32, ease: "easeOut" }}
          className="p-5 sm:p-7"
        >
        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-4 py-3 text-center text-[13px] text-[var(--qs-muted)]"
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em]",
              !accessChecking && reason !== "unknown" && hasPaidPlan
                ? "border-[var(--qs-ok)] text-[var(--qs-ok)]"
                : accessChecking || reason === "unknown"
                  ? "border-[var(--qs-line)] text-[var(--qs-muted)]"
                  : "border-[var(--qs-bad)] text-[var(--qs-bad)]"
            )}
          >
            {planLabel}
          </span>
          {!accessChecking && totalRemaining > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-line)] px-2.5 py-0.5 text-[11px] font-extrabold text-[var(--qs-ink)]">
              <Coins className="h-3 w-3" />
              {totalRemaining.toLocaleString("en-IN")} credits left
            </span>
          )}
          <span className="basis-full">
            {reasonTitle ? (
              <strong className="font-extrabold text-[var(--qs-ink)]">
                {reasonTitle}:{" "}
              </strong>
            ) : null}
            {reasonMessage}
          </span>
          {reason === "unknown" && (
            <button
              type="button"
              onClick={retryAccess}
              className="cursor-pointer rounded-md px-1.5 py-0.5 text-[12px] font-extrabold text-[var(--qs-brand)] hover:underline"
            >
              Retry
            </button>
          )}
        </div>

        {availableTabs.length === 1 ? (
          <div className="mt-4 flex items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[13px] font-extrabold text-[var(--qs-ink)]">
            {availableTabs[0].id === "credits" ? (
              <Coins className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {availableTabs[0].label}
          </div>
        ) : (
          <div
            role="tablist"
            aria-label="Upgrade options"
            className="mt-4 flex gap-1.5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-1.5"
          >
            {availableTabs.map((option) => {
              const Icon = option.icon;
              const active = effectiveTab === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`upgrade-panel-${option.id}`}
                  onClick={() => setTab(option.id)}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-extrabold transition-colors",
                    active
                      ? "border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                      : "border-2 border-transparent text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-[238px] animate-pulse rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm font-bold text-[var(--qs-ink)]">
              Plans could not be loaded.
            </p>
            <p className="mt-1 text-xs text-[var(--qs-muted)]">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 cursor-pointer rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-[13px] font-extrabold text-[var(--qs-on-brand)]"
            >
              Try again
            </button>
          </div>
        ) : activeOptions === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-[var(--qs-muted)]">
            No{" "}
            {effectiveTab === "credits" ? "credit packs" : "monthly plans"} are
            available right now.
          </p>
        ) : (
          <>
            {effectiveTab === "credits" && reason === "plan_required" && (
              <p className="mt-4 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5 text-left text-[12px] font-semibold leading-5 text-[var(--qs-muted)]">
                Credit packs don&apos;t unlock AI on their own — you still need
                a monthly plan. Your purchased credits stay valid and will be
                waiting when you subscribe.
              </p>
            )}
            <div
              id={`upgrade-panel-${effectiveTab}`}
              role="tabpanel"
              className="grid grid-cols-1 gap-5 px-0 pb-3 pt-6 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
            >
              {effectiveTab === "credits"
                ? catalog.creditPacks.map((pack) => (
                    <PackCard
                      key={pack.id}
                      pack={pack}
                      selected={selectedPack?.id === pack.id}
                      onSelect={() => setPackId(pack.id)}
                    />
                  ))
                : catalog.plans.map((plan) => (
                    <PlanCard
                      key={plan.slug}
                      plan={plan}
                      selected={selectedPlan?.slug === plan.slug}
                      onSelect={() => setPlanSlug(plan.slug)}
                    />
                  ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={startCheckout}
          disabled={isLoading || activeOptions === 0}
          className="mt-2 w-full cursor-pointer rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-3.5 text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ctaLabel}
        </button>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[12px] font-medium text-[var(--qs-muted)]">
          <span>
            {effectiveTab === "credits"
              ? "One-time purchase · Credits stack on every plan."
              : "Billed monthly · Cancel anytime"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-1.5 py-1 text-[13px] font-bold text-[var(--qs-brand)] hover:underline"
          >
            Maybe later
          </button>
        </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function UpgradeModalHost() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<UpgradeModalDetail>({});

  useEffect(() => {
    const onOpen = (event: Event) => {
      const nextDetail =
        event instanceof CustomEvent && event.detail
          ? (event.detail as UpgradeModalDetail)
          : {};
      setDetail(nextDetail);
      setOpen(true);
    };
    window.addEventListener(UPGRADE_MODAL_EVENT, onOpen);
    return () => window.removeEventListener(UPGRADE_MODAL_EVENT, onOpen);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <UpgradeModalContent
          detail={detail}
          onClose={() => setOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}
