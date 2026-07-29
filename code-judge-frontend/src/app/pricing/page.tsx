"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function PricingPage() {
  const [subscribing, setSubscribing] = useState<string | null>(null);

  async function handleSubscribe(plan: string) {
    setSubscribing(plan);
    try {
      // Simulate API call — replace with actual subscription service
      await new Promise((r) => setTimeout(r, 1000));
      toast.success(`Subscribed to ${plan} plan successfully!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Subscription failed";
      toast.error(msg);
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Pricing</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <h3 className="mb-1 text-sm font-bold text-[#111827]">Free</h3>
          <div className="mb-2 text-lg font-bold text-[#2563EB]">$0</div>
          <ul className="mb-3 space-y-1 text-[10px] text-[#6B7280]">
            <li>100 problems/month</li>
            <li>Basic AI hints</li>
            <li>Public leaderboard</li>
          </ul>
          <button className="rounded border border-[#E6E7EB] bg-white px-4 py-1 text-[10px] font-medium text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors cursor-not-allowed opacity-60">
            Current Plan
          </button>
        </div>
        <div className="border-2 border-[#2563EB] bg-white p-4 text-center">
          <h3 className="mb-1 text-sm font-bold text-[#111827]">Pro</h3>
          <div className="mb-2 text-lg font-bold text-[#2563EB]">$9/mo</div>
          <ul className="mb-3 space-y-1 text-[10px] text-[#6B7280]">
            <li>Unlimited problems</li>
            <li>Advanced AI hints & reviews</li>
            <li>Priority support</li>
          </ul>
          <button
            onClick={() => handleSubscribe("Pro")}
            disabled={subscribing === "Pro"}
            className="rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1 text-[10px] font-medium text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {subscribing === "Pro" ? "Subscribing..." : "Subscribe"}
          </button>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <h3 className="mb-1 text-sm font-bold text-[#111827]">Team</h3>
          <div className="mb-2 text-lg font-bold text-[#2563EB]">$29/mo</div>
          <ul className="mb-3 space-y-1 text-[10px] text-[#6B7280]">
            <li>Everything in Pro</li>
            <li>Team analytics</li>
            <li>Custom problem sets</li>
          </ul>
          <button
            onClick={() => handleSubscribe("Team")}
            disabled={subscribing === "Team"}
            className="rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1 text-[10px] font-medium text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {subscribing === "Team" ? "Subscribing..." : "Subscribe"}
          </button>
        </div>
      </div>
      <div className="mt-6 border-t border-[#E6E7EB] pt-4">
        <Link href="/" className="text-[11px] text-[#2563EB] hover:underline">← Back to Home</Link>
      </div>
    </div>
  );
}