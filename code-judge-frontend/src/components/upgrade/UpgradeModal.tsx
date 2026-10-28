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
  const { subscription } = useMySubscription();
  const balance = useAICreditsStore((state) => state.balance);
  const [tab, setTab] = useState<UpgradeTab>(detail.tab ?? "credits");
  const [packId, setPackId] = useState<string | null>(null);
  const [planSlug, setPlanSlug] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const selectedPack =
    catalog.creditPacks.find((pack) => pack.id === packId) ??
    catalog.creditPacks.find((pack) => pack.popular) ??
    catalog.creditPacks[0] ??
    null;
  const selectedPlan =
    catalog.plans.find((plan) => plan.slug === planSlug) ??
    catalog.plans.find((plan) => plan.featured) ??
    catalog.plans[0] ??
    null;

  const activePlan = catalog.plans.find(
    (plan) => plan.slug === subscription?.planSlug
  );
  const hasPaidPlan =
    subscription?.isPaid === true && subscription.status !== "trialing";
  const currentPlanLabel = hasPaidPlan
    ? activePlan?.name ?? "Active plan"
    : balance.planId !== "free"
      ? "Active plan"
      : "Free plan";
  const currentMessage =
    detail.message ||
    (hasPaidPlan
      ? "Your AI credits are used up. Top up or move to a bigger plan."
      : "AI generation is locked on your current plan.");
  const title = detail.title ?? DEFAULT_TITLE;
  const titleAccent = detail.title ? detail.titleAccent : DEFAULT_TITLE_ACCENT;

  const startCheckout = () => {
    if (tab === "credits" && selectedPack) {
      onClose();
      router.push(
        `/creator/billing/credits?pack=${encodeURIComponent(selectedPack.id)}`
      );
      return;
    }
    if (tab === "plans" && selectedPlan) {
      onClose();
      router.push(
        `/creator/billing/plans?plan=${encodeURIComponent(selectedPlan.slug)}`
      );
    }
  };

  const ctaLabel =
    tab === "credits" && selectedPack
      ? `Buy ${selectedPack.name} · ${formatPricingAmount(selectedPack.price)}`
      : tab === "plans" && selectedPlan
        ? `Upgrade to ${selectedPlan.name} · ${formatPricingAmount(
            selectedPlan.price,
            selectedPlan.currency
          )}/mo`
        : "Choose an option";

  const activeOptions =
    tab === "credits" ? catalog.creditPacks.length : catalog.plans.length;

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
            className="absolute right-4 top-4 z-20 grid h-[38px] w-[38px] place-items-center rounded-[11px] border-2 border-white/25 bg-white/10 text-white transition-colors hover:border-[var(--qs-sun)] hover:bg-white/15 sm:right-6 sm:top-6 sm:h-[42px] sm:w-[42px]"
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
                {detail.description ??
                  "Pick an AI credit pack for an instant top-up, or move to a monthly plan with credits included."}
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
        <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-4 py-3 text-center text-[13px] text-[var(--qs-muted)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-bad)] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-bad)]">
            {currentPlanLabel}
          </span>
          {currentMessage}
        </div>

        <div
          role="tablist"
          aria-label="Upgrade options"
          className="mt-4 flex gap-1.5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-1.5"
        >
          {(
            [
              { id: "credits", label: "AI credits", icon: Coins },
              { id: "plans", label: "Monthly plans", icon: Sparkles },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const active = tab === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`upgrade-panel-${option.id}`}
                onClick={() => setTab(option.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-extrabold transition-colors",
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
              className="mt-4 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-[13px] font-extrabold text-[var(--qs-on-brand)]"
            >
              Try again
            </button>
          </div>
        ) : activeOptions === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-[var(--qs-muted)]">
            No {tab === "credits" ? "credit packs" : "monthly plans"} are
            available right now.
          </p>
        ) : (
          <div
            id={`upgrade-panel-${tab}`}
            role="tabpanel"
            className="grid grid-cols-1 gap-5 px-0 pb-3 pt-6 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
          >
            {tab === "credits"
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
        )}

        <button
          type="button"
          onClick={startCheckout}
          disabled={isLoading || activeOptions === 0}
          className="mt-2 w-full rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-3.5 text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ctaLabel}
        </button>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[12px] font-medium text-[var(--qs-muted)]">
          <span>
            {tab === "credits"
              ? "One-time purchase · Credits stack on every plan."
              : "Billed monthly · Cancel anytime"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-1.5 py-1 text-[13px] font-bold text-[var(--qs-brand)] hover:underline"
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
