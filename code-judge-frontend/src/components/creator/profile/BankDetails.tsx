"use client";

import { IndianRupee, CheckCircle2, Plus } from "lucide-react";
import { cn } from "@/lib/helpers";

const BANK_ACCOUNTS = [
  {
    id: "acc_hdfc",
    bankName: "HDFC Bank",
    holderName: "Aarav Verma",
    maskedNumber: "•••• •••• 4821",
    ifsc: "HDFC0001234",
    isPrimary: true,
    verified: true,
  },
  {
    id: "acc_icici",
    bankName: "ICICI Bank",
    holderName: "Aarav Verma",
    maskedNumber: "•••• •••• 7703",
    ifsc: "ICIC0007710",
    isPrimary: false,
    verified: true,
  },
];

export function BankDetails() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-profile-text-primary">Bank Details</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-profile-border px-3 py-1.5 text-[12px] font-semibold text-profile-text-secondary transition-colors hover:border-profile-accent/30 hover:text-profile-accent"
        >
          <Plus className="h-3 w-3" />
          Add Account
        </button>
      </div>

      <div className="space-y-2">
        {BANK_ACCOUNTS.map((acc) => (
          <div
            key={acc.id}
            className={cn(
              "flex items-center gap-4 rounded-xl border p-4 transition-colors",
              acc.isPrimary
                ? "border-profile-accent/20 bg-profile-accent-soft"
                : "border-profile-border bg-profile-surface"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-profile-surface-elevated">
              <IndianRupee className="h-4.5 w-4.5 text-profile-text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-profile-text-primary">{acc.bankName}</p>
                {acc.isPrimary && (
                  <span className="rounded-md bg-profile-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-profile-accent">
                    Primary
                  </span>
                )}
                {acc.verified && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-profile-accent" />
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-profile-text-secondary">
                {acc.maskedNumber} · {acc.holderName}
              </p>
              <p className="text-[11px] text-profile-text-muted">IFSC: {acc.ifsc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
