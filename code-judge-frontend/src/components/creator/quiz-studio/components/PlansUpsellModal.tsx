"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppWindow,
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  Crop,
  FileSpreadsheet,
  FileUp,
  Layers3,
  Mail,
  Maximize,
  Send,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { formatBillingPeriod, formatPricingAmount } from "@/services/pricing";
import type { PricingPlan } from "@/types/pricing";

export type PlansUpsellPreset = "anti-cheat" | "email" | "ai" | "headers";

interface UpsellFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: string;
  pill: string;
}

interface UpsellPreset {
  icon: LucideIcon;
  titleLead: string;
  titleAccent: string;
  description: string;
  highlight: string;
  features: UpsellFeature[];
  footerHint: string;
}

const PRESETS: Record<PlansUpsellPreset, UpsellPreset> = {
  "anti-cheat": {
    icon: ShieldCheck,
    titleLead: "Unlock",
    titleAccent: "anti-cheat mode",
    description:
      "Run fair quizzes with fullscreen, tab-switch detection and copy protection. Included on every paid plan.",
    highlight: "Anti-cheat mode",
    features: [
      {
        icon: Maximize,
        title: "Fullscreen",
        description: "Keeps the quiz in fullscreen",
        tone: "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
        pill: "bg-[var(--qs-poly-0)]",
      },
      {
        icon: AppWindow,
        title: "Tab-switch detection",
        description: "Flags students who leave the tab",
        tone: "bg-[#fff3d6] text-[#a85d00]",
        pill: "bg-[#fff3d6]",
      },
      {
        icon: Copy,
        title: "Copy protection",
        description: "Blocks copying question text",
        tone: "bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
        pill: "bg-[var(--qs-okbg)]",
      },
    ],
    footerHint: "Switch on anti-cheat in Security settings right after upgrading.",
  },
  email: {
    icon: Mail,
    titleLead: "Unlock",
    titleAccent: "email reports",
    description:
      "Email the Excel response report to yourself in one click. Included on every paid plan.",
    highlight: "Email reports",
    features: [
      {
        icon: FileSpreadsheet,
        title: "Excel report",
        description: "Complete responses as a spreadsheet",
        tone: "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
        pill: "bg-[var(--qs-poly-0)]",
      },
      {
        icon: Send,
        title: "One-click send",
        description: "Delivered straight to your inbox",
        tone: "bg-[#fff3d6] text-[#a85d00]",
        pill: "bg-[#fff3d6]",
      },
      {
        icon: CalendarClock,
        title: "Auto after quiz",
        description: "Sent automatically when the quiz ends",
        tone: "bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
        pill: "bg-[var(--qs-okbg)]",
      },
    ],
    footerHint: "Send your first report right after upgrading.",
  },
  ai: {
    icon: Sparkles,
    titleLead: "Unlock",
    titleAccent: "AI question generation",
    description:
      "Turn your notes, PDFs and topics into ready-to-use questions in seconds. Included on every paid plan.",
    highlight: "AI question generation",
    features: [
      {
        icon: Wand2,
        title: "AI question drafting",
        description: "Generate questions from a topic or text",
        tone: "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
        pill: "bg-[var(--qs-poly-0)]",
      },
      {
        icon: FileUp,
        title: "Upload notes & PDFs",
        description: "Turn source material into a question bank",
        tone: "bg-[#fff3d6] text-[#a85d00]",
        pill: "bg-[#fff3d6]",
      },
      {
        icon: Sparkles,
        title: "One-click insert",
        description: "Review, tweak and add questions instantly",
        tone: "bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
        pill: "bg-[var(--qs-okbg)]",
      },
    ],
    footerHint: "Start generating questions right after upgrading.",
  },
  headers: {
    icon: FileUp,
    titleLead: "Unlock",
    titleAccent: "paper headers",
    description:
      "Put your institute's letterhead on every question paper PDF. Included on every paid plan.",
    highlight: "Custom paper headers",
    features: [
      {
        icon: FileUp,
        title: "Upload letterheads",
        description: "Use a PDF, PNG or JPG file",
        tone: "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
        pill: "bg-[var(--qs-poly-0)]",
      },
      {
        icon: Crop,
        title: "Place on A4",
        description: "Crop and position it on the page",
        tone: "bg-[#fff3d6] text-[#a85d00]",
        pill: "bg-[#fff3d6]",
      },
      {
        icon: Layers3,
        title: "Repeat on every page",
        description: "Keeps the header consistent throughout",
        tone: "bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
        pill: "bg-[var(--qs-okbg)]",
      },
    ],
    footerHint: "Upload your first header right after upgrading.",
  },
};

function PlanCard({ plan, highlight }: { plan: PricingPlan; highlight: string }) {
  const monthlyPrice =
    plan.prices.find((price) => price.billingPeriod === "monthly") ??
    plan.prices[0];
  const amount = monthlyPrice?.amount ?? plan.price;
  const currency = monthlyPrice?.currency ?? plan.currency;
  const period = monthlyPrice
    ? formatBillingPeriod(monthlyPrice.billingPeriod, monthlyPrice.customDays)
    : "Monthly";
  const features = plan.features.filter(
    (feature) =>
      !/trial/i.test(feature) &&
      feature.trim().toLowerCase() !== highlight.trim().toLowerCase()
  );
  const popular = plan.featured;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col rounded-[16px] border-2 p-4",
        popular
          ? "border-[var(--qs-brand)] bg-[var(--qs-poly-0)] shadow-[3px_3px_0_var(--qs-sun)]"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[17px] font-extrabold text-[var(--qs-ink)]">
          {plan.name}
        </span>
        {popular ? (
          <span className="rounded-[6px] bg-[var(--qs-sun)] px-[7px] py-[3px] text-[10px] font-extrabold tracking-[0.06em] text-[#1A1240]">
            POPULAR
          </span>
        ) : (
          <span className="rounded-[6px] bg-[var(--qs-poly-1)] px-[7px] py-[3px] text-[10px] font-bold tracking-[0.06em] text-[var(--qs-brand)]">
            {period.toUpperCase()} PLAN
          </span>
        )}
      </div>

      <div className="mb-3 mt-2">
        <span
          className={cn(
            "text-[30px] font-extrabold leading-none",
            popular ? "text-[var(--qs-brand)]" : "text-[var(--qs-ink)]"
          )}
        >
          {formatPricingAmount(amount, currency)}
        </span>
        <span className="text-[12px] font-medium text-[var(--qs-muted)]">
          {" "}
          / {period.toLowerCase()}
        </span>
      </div>

      <ul className="m-0 flex flex-1 list-none flex-col gap-[2px] p-0">
        <li className="flex min-h-[24px] items-center gap-2 text-[13px] font-medium text-[var(--qs-ink)]">
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
            <Check className="h-[11px] w-[11px]" strokeWidth={3} />
          </span>
          <span className="rounded-[6px] bg-[var(--qs-poly-5)] px-1.5 py-px font-bold text-[#1A1240]">
            {highlight}
          </span>
        </li>
        {features.map((feature) => (
          <li
            key={feature}
            className="flex min-h-[24px] items-center gap-2 text-[13px] font-medium text-[var(--qs-ink)]"
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
              <Check className="h-[11px] w-[11px]" strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={`/creator/billing/plans?plan=${plan.slug}`}
        className={cn(
          "mt-3.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-brand)] text-[14px] font-bold text-[var(--qs-on-brand)] no-underline transition-transform hover:-translate-y-px active:translate-y-0",
          popular ? "bg-[var(--qs-brand)]" : "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]"
        )}
      >
        {plan.cta || `Choose ${plan.name}`}
        <ArrowRight className="h-[15px] w-[15px]" />
      </Link>
    </div>
  );
}

export function PlansUpsellModal({
  open,
  onClose,
  preset = "anti-cheat",
}: {
  open: boolean;
  onClose: () => void;
  preset?: PlansUpsellPreset;
}) {
  const { catalog, isLoading, error, refresh } = usePricingCatalog();
  const plans = catalog.plans.filter((plan) => plan.price > 0);
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const content = PRESETS[preset];
  const HeaderIcon = content.icon;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(26,16,51,0.62)] p-0 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.section
            aria-label="Paid plans"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border-2 border-b-0 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 sm:max-w-[720px] sm:rounded-[20px] sm:border-b-2 sm:p-6 sm:shadow-[8px_8px_0_var(--qs-sun)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--qs-line)] sm:hidden" />

            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                <HeaderIcon className="h-[22px] w-[22px]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[21px]">
                  {content.titleLead}{" "}
                  <span className="text-[var(--qs-brand)]">{content.titleAccent}</span>
                </h2>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-[var(--qs-muted)]">
                  {content.description}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="mt-3.5 hidden grid-cols-3 gap-3.5 rounded-[14px] bg-[var(--qs-poly-0)] p-3.5 sm:grid">
              {content.features.map(({ icon: Icon, title, description, tone }) => (
                <div key={title} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)]",
                      tone
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-[var(--qs-ink)]">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-medium leading-snug text-[var(--qs-muted)]">
                      {description}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3.5 flex flex-wrap gap-1.5 sm:hidden">
              {content.features.map(({ icon: Icon, title, tone, pill }) => (
                <span
                  key={title}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--qs-ink)]",
                    pill
                  )}
                >
                  <span className={cn("flex rounded-full p-0.5", tone)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {title}
                </span>
              ))}
            </div>

            {isLoading ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="h-[260px] flex-1 animate-pulse rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)]"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="mt-4 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 text-center">
                <p className="text-sm font-extrabold text-[var(--qs-ink)]">
                  Plans could not be loaded.
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">{error}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-3 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-2 text-xs font-extrabold text-[var(--qs-on-brand)]"
                >
                  Try again
                </button>
              </div>
            ) : plans.length === 0 ? (
              <div className="mt-4 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 text-center">
                <p className="text-sm font-extrabold text-[var(--qs-ink)]">
                  No paid plans available right now.
                </p>
                <Link
                  href="/creator/billing/plans"
                  onClick={onClose}
                  className="mt-3 inline-flex rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-2 text-xs font-extrabold text-[var(--qs-on-brand)]"
                >
                  View all plans
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-3.5">
                {plans.map((plan) => (
                  <PlanCard key={plan.slug} plan={plan} highlight={content.highlight} />
                ))}
              </div>
            )}

            <div className="mt-3.5 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-okbg)] px-2.5 py-1.5">
                <p className="text-[13px] font-bold text-[var(--qs-ok)]">
                  {trialPlan
                    ? `A ${trialPlan.trialDays}-day ${trialPlan.name} trial is available`
                    : "Upgrade anytime to unlock this feature"}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--qs-muted)]">
                  {content.footerHint}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/creator/billing/plans"
                  onClick={onClose}
                  className="flex min-h-[44px] items-center px-1.5 text-[13px] font-bold text-[var(--qs-brand)] underline underline-offset-2"
                >
                  Compare all plans
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex min-h-[44px] items-center px-3.5 text-[13px] font-bold text-[var(--qs-ink)]"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
