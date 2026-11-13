"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/helpers";

const BILLING_TABS = [
  { label: "Overview", href: "/creator/billing", exact: true },
  { label: "Monthly plans", href: "/creator/billing/plans" },
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
      <div className="flex w-fit items-center gap-1.5 rounded-[20px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[0_4px_0_var(--qs-sun)] sm:gap-1 sm:rounded-[16px] sm:border-2 sm:p-[5px] sm:shadow-[0_4px_0_var(--qs-sun)]">
        {BILLING_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex h-11 shrink-0 items-center rounded-[14px] px-4 text-[15px] font-bold transition-colors sm:h-auto sm:rounded-[11px] sm:px-3.5 sm:py-2.5 sm:text-[13.5px] sm:font-extrabold",
                isActive
                  ? "bg-[var(--qs-ink)] text-[var(--qs-bg)]"
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
