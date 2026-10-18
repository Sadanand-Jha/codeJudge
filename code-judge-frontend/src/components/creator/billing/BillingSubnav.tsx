"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, ArrowLeftRight, CreditCard, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";

const BILLING_TABS = [
  { label: "Overview", href: "/creator/billing", icon: Wallet, exact: true },
  // Selling tabs disabled for now (routes commented out, components kept):
  // { label: "Earnings", href: "/creator/billing/earnings", icon: TrendingUp },
  { label: "Transactions", href: "/creator/billing/transactions", icon: ArrowLeftRight },
  // { label: "Payouts", href: "/creator/billing/payouts", icon: Banknote },
  // { label: "Products", href: "/creator/billing/products", icon: ShoppingBag },
  // { label: "Refunds", href: "/creator/billing/refunds", icon: RotateCcw },
  // { label: "Tax", href: "/creator/billing/tax", icon: Scale },
  // { label: "Documents", href: "/creator/billing/documents", icon: FolderOpen },
  { label: "AI Credits", href: "/creator/billing/credits", icon: Sparkles },
  { label: "Payment Settings", href: "/creator/billing/settings", icon: CreditCard },
];

export function BillingSubnav() {
  const pathname = usePathname();

  return (
    <div className="relative z-10 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
      <div className="flex w-fit items-center gap-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-0.5">
        {BILLING_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-xs font-bold transition-colors",
                isActive
                  ? "bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                  : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
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
