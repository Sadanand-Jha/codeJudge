"use client";

import { IndianRupee, TrendingUp, Wallet, ArrowRight } from "lucide-react";

export function CreatorFinance() {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-profile-text-primary">Creator Finance</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FinanceCard
          icon={Wallet}
          label="Available Balance"
          value="₹12,450"
        />
        <FinanceCard
          icon={TrendingUp}
          label="This Month"
          value="₹8,200"
        />
        <FinanceCard
          icon={IndianRupee}
          label="Total Earnings"
          value="₹42,800"
        />
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-profile-accent transition-colors hover:text-profile-accent-hover"
      >
        Manage Payments
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FinanceCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-profile-border bg-profile-surface px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-profile-text-muted" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-profile-text-muted">
          {label}
        </span>
      </div>
      <p className="mt-2 text-[20px] font-bold tracking-tight text-profile-text-primary">{value}</p>
    </div>
  );
}
