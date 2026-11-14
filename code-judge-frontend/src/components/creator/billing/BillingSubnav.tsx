"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, History, LayoutGrid, Zap } from "lucide-react";
import { cn } from "@/lib/helpers";

const BILLING_TABS = [
  { label: "Overview", href: "/creator/billing", exact: true, icon: LayoutGrid },
  { label: "Plans", href: "/creator/billing/plans", icon: Zap },
  { label: "AI credits", href: "/creator/billing/credits", icon: Coins },
  { label: "Transactions", href: "/creator/billing/transactions", icon: History },
  // Selling tabs disabled for now (routes commented out, components kept):
  // { label: "Earnings", href: "/creator/billing/earnings" },
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
    <div className="relative z-10 flex w-full gap-0.5 rounded-[20px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-[5px] shadow-[0_4px_0_var(--qs-sun)]">
      {BILLING_TABS.map(({ label, href, exact, icon: Icon }) => {
        const isActive = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[15px] px-0.5 pb-[7px] pt-2 text-[11px] font-medium leading-[1.2] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d5df6] max-[340px]:text-[10px]",
              isActive
                ? "bg-[var(--qs-ink)] text-white!"
                : "text-[#475569] hover:bg-[#eef2ff]"
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
