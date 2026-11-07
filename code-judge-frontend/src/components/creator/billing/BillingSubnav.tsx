"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/helpers";

const BILLING_TABS = [
  { label: "Overview", href: "/creator/billing", exact: true },
  { label: "Plans", href: "/creator/billing/plans" },
  { label: "AI credits", href: "/creator/billing/credits" },
  // Selling tabs disabled for now (routes commented out, components kept):
  // { label: "Earnings", href: "/creator/billing/earnings" },
  { label: "Transactions", href: "/creator/billing/transactions" },
  // { label: "Payouts", href: "/creator/billing/payouts" },
  // { label: "Products", href: "/creator/billing/products" },
  // { label: "Refunds", href: "/creator/billing/refunds" },
  // { label: "Tax", href: "/creator/billing/tax" },
  // { label: "Documents", href: "/creator/billing/documents" },
  // { label: "Payment settings", href: "/creator/billing/settings" },
];

export function BillingSubnav() {
  const pathname = usePathname();

  return (
    <div className="relative z-10 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
      <div className="flex w-fit items-center gap-1 rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-[5px] shadow-[4px_4px_0_var(--qs-sun)]">
        {BILLING_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex shrink-0 items-center rounded-[11px] px-3.5 py-2.5 text-[13.5px] font-extrabold transition-colors",
                isActive
                  ? "bg-[#1d1840] text-[var(--qs-sun)] dark:bg-[var(--qs-brand)] dark:text-white"
                  : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
