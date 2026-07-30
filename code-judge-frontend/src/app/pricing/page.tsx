"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["Access to all problems", "Basic submissions", "Community support"],
    current: true,
    color: "#9CA3AF",
  },
  {
    name: "Pro",
    price: "$9/mo",
    features: ["Everything in Free", "AI hints & feedback", "Detailed analytics", "Priority support"],
    current: false,
    color: "#7C3AED",
  },
  {
    name: "Team",
    price: "$29/mo",
    features: ["Everything in Pro", "Team leaderboards", "Custom contests", "Admin dashboard"],
    current: false,
    color: "#3B82F6",
  },
];

export default function PricingPage() {
  const [subscribing, setSubscribing] = useState<string | null>(null);

  async function handleSubscribe(plan: string) {
    if (plan === "Free") return;
    setSubscribing(plan);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success(`${plan} plan selected! (Demo)`);
    } catch {
      toast.error("Failed to subscribe");
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Pricing</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Choose the plan that&apos;s right for you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 ${
                  plan.name === "Pro"
                    ? "border-[#7C3AED]/30 bg-[#111827] shadow-[0_0_24px_rgba(124,58,237,0.08)]"
                    : "border-white/[0.06] bg-[#111827]"
                }`}
              >
                {plan.name === "Pro" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold text-white bg-[#7C3AED]">
                      <Sparkles className="w-3 h-3" />
                      Popular
                    </span>
                  </div>
                )}
                <h3 className="text-sm font-bold text-white mb-1">{plan.name}</h3>
                <div className="text-2xl font-bold text-white mb-4">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                      <Check className="w-3.5 h-3.5" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={plan.current || subscribing === plan.name}
                  className={`w-full px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                    plan.current
                      ? "bg-white/[0.04] text-[#6B7280] border border-white/[0.06] cursor-not-allowed"
                      : "text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] disabled:opacity-50"
                  }`}
                >
                  {plan.current ? "Current Plan" : subscribing === plan.name ? "Processing..." : "Subscribe"}
                </button>
              </div>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#7C3AED] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
