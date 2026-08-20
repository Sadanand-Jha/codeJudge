"use client";

import { IndianRupee, PiggyBank, TrendingUp } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";

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
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h2 className="text-lg font-extrabold text-text-primary">Pricing & Monetization</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Configure whether your quiz is free or paid. Actual payout depends on the
          configured payment system; the figures below are indicative.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label
          className={cn(
            "flex flex-col gap-1 rounded-2xl border p-5 text-left transition-all",
            p.mode === "free"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-border hover:border-border-hover"
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
          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">FREE</span>
          <span className="text-xs text-text-secondary">Reach the widest audience. No price, no friction.</span>
        </label>
        <label
          className={cn(
            "flex flex-col gap-1 rounded-2xl border p-5 text-left transition-all",
            p.mode === "paid"
              ? "border-pink-500/40 bg-pink-500/5"
              : "border-border hover:border-border-hover"
          )}
        >
          <input
            type="radio"
            className="sr-only"
            checked={p.mode === "paid"}
            onChange={() => updatePricing({ mode: "paid", price: 199, originalPrice: 249 })}
          />
          <span className="text-base font-extrabold text-pink-600 dark:text-pink-400">PAID</span>
          <span className="text-xs text-text-secondary">Set a price and earn from every enrollment.</span>
        </label>
      </div>

      {p.mode === "paid" && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-text-secondary">
                Your Price (₹)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  min={0}
                  value={p.price || ""}
                  onChange={(e) => updatePricing({ price: Number(e.target.value) })}
                  placeholder="199"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-3.5 text-sm text-text-primary"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-text-secondary">
                Original / MRP (₹)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  min={0}
                  value={p.originalPrice || ""}
                  onChange={(e) => updatePricing({ originalPrice: Number(e.target.value) })}
                  placeholder="249"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-3.5 text-sm text-text-primary"
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl bg-emerald-500/8 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-300",
              !(p.originalPrice > p.price && p.price > 0) && "hidden"
            )}
          >
            Students will see ₹{p.price} with{" "}
            <span className="font-extrabold">
              {Math.round((1 - p.price / p.originalPrice) * 100)}% OFF
            </span>{" "}
            against ₹{p.originalPrice}.
          </div>

          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
              Payout Estimate
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {breakdown.map((b) => (
                <div key={b.label} className="rounded-lg border border-border p-2.5">
                  <p className="text-[10px] text-text-secondary">{b.label}</p>
                  <p className="text-lg font-bold text-text-primary">{b.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-text-secondary">
              Platform fee (10%) and creator earnings update live as you change the
              price. Actual fees depend on the payment provider configured in
              Creator payout settings.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-secondary">
          <PiggyBank className="h-4 w-4" /> Payment history & payout account
        </div>
        <p className="text-xs text-text-secondary">
          Bank details, tax information, and payout schedule live under{" "}
          <span className="text-text-primary">Creator Studio → Billing → Payment Settings</span>.
          They are never part of the student-facing quiz.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">This month: ₹0 earned</span>
          <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
        </div>
      </div>
    </div>
  );
}