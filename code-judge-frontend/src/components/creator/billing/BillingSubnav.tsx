"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, ArrowLeftRight, CalendarClock, CreditCard, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";

const BILLING_TABS = [
  { label: "Overview", href: "/creator/billing", icon: Wallet, exact: true },
  { label: "Monthly plans", href: "/creator/billing/plans", icon: CalendarClock },
  { label: "AI credits", href: "/creator/billing/credits", icon: Sparkles },
  // Selling tabs disabled for now (routes commented out, components kept):
  // { label: "Earnings", href: "/creator/billing/earnings", icon: TrendingUp },
  { label: "Transactions", href: "/creator/billing/transactions", icon: ArrowLeftRight },
  // { label: "Payouts", href: "/creator/billing/payouts", icon: Banknote },
  // { label: "Products", href: "/creator/billing/products", icon: ShoppingBag },
  // { label: "Refunds", href: "/creator/billing/refunds", icon: RotateCcw },
  // { label: "Tax", href: "/creator/billing/tax", icon: Scale },
  // { label: "Documents", href: "/creator/billing/documents", icon: FolderOpen },
  { label: "Payment settings", href: "/creator/billing/settings", icon: CreditCard },
];

export function BillingSubnav() {
  const pathname = usePathname();

  return (
    <div className="relative z-10 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
      <div className="flex w-fit items-center gap-1 rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1 shadow-[3px_3px_0_var(--qs-sun)]">
        {BILLING_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-[11px] px-4 py-2.5 text-[12px] font-bold transition-colors",
                isActive
                  ? "bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                  : "text-[var(--qs-muted)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
