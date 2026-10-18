"use client";

import { motion } from "framer-motion";
import { IndianRupee, PiggyBank, TrendingUp } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { StudioStepHeader, StudioStepLayout } from "../primitives";

export function PricingStep() {
  const { state, updatePricing, updateBranding } = useStudio();
  const p = state.pricing;

  const platformFee = p.mode === "paid" && p.price > 0 ? Math.round(p.price * 0.1) : 0;
  const earnings = p.mode === "paid" && p.price > 0 ? p.price - platformFee : 0;

  const breakdown = [
    { label: "Student pays", value: p.mode === "paid" ? `₹${p.price}` : "Free" },
    { label: "Platform fee", value: `₹${platformFee}` },
    { label: "Creator earns", value: `₹${earnings}` },
  ];

  return (
    <StudioStepLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <StudioStepHeader title="Pricing & Monetization" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="grid grid-cols-2 gap-2.5 sm:gap-4"
      >
        <label
          className={cn(
            "flex min-h-24 cursor-pointer flex-col justify-center gap-1 rounded-[18px] border-2 p-4 text-left transition-colors sm:p-5",
            p.mode === "free"
              ? "border-[var(--qs-ink)] bg-[var(--qs-okbg)]"
              : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
          )}
        >
          <input
            type="radio"
            className="sr-only"
            checked={p.mode === "free"}
            onChange={() => {
              updatePricing({ mode: "free", price: 0, originalPrice: 0 });
              updateBranding({});
            }}
          />
          <span className="flex items-center gap-2 text-base font-extrabold text-[var(--qs-ok)]">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border-2",
                p.mode === "free" ? "border-[var(--qs-ok)] bg-[var(--qs-ok)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
              )}
            >
              {p.mode === "free" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            FREE
          </span>
        </label>
        <div
          className={cn(
            "flex min-h-24 flex-col justify-center gap-1 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 text-left opacity-60 sm:p-5",
            p.mode === "paid" && "opacity-100"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-extrabold text-[var(--qs-brand)]">PAID</span>
            <span className="rounded-full border-2 border-[var(--qs-line)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Coming soon
            </span>
          </div>
        </div>
      </motion.div>

      {p.mode === "paid" && (
        <div className="space-y-5 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Your Price (₹)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
                <input
                  type="number"
                  min={0}
                  value={p.price || ""}
                  onChange={(e) => updatePricing({ price: Number(e.target.value) })}
                  placeholder="199"
                  className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-3.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Original / MRP (₹)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
                <input
                  type="number"
                  min={0}
                  value={p.originalPrice || ""}
                  onChange={(e) => updatePricing({ originalPrice: Number(e.target.value) })}
                  placeholder="249"
                  className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-3.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "rounded-[12px] border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] px-4 py-3 text-xs font-bold text-[var(--qs-ok)]",
              !(p.originalPrice > p.price && p.price > 0) && "hidden"
            )}
          >
            Students will see ₹{p.price} with{" "}
            <span className="font-extrabold">
              {Math.round((1 - p.price / p.originalPrice) * 100)}% OFF
            </span>{" "}
            against ₹{p.originalPrice}.
          </div>

          <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Payout Estimate
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {breakdown.map((b) => (
                <div key={b.label} className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2.5">
                  <p className="text-[10px] font-bold text-[var(--qs-muted)]">{b.label}</p>
                  <p className="text-lg font-extrabold tabular-nums text-[var(--qs-ink)]">{b.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-medium text-[var(--qs-muted)]">
              Platform fee (10%) and creator earnings update live as you change the
              price. Actual fees depend on the payment provider configured in
              Creator payout settings.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
          <PiggyBank className="h-4 w-4" /> Payment history & payout account
        </div>
        <p className="text-xs font-medium text-[var(--qs-muted)]">
          Bank details, tax information, and payout schedule live under{" "}
          <span className="font-bold text-[var(--qs-ink)]">Creator Studio → Billing → Payment Settings</span>.
          They are never part of the student-facing quiz.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--qs-muted)]">This month: ₹0 earned</span>
          <TrendingUp className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
        </div>
      </div>
    </StudioStepLayout>
  );
}
