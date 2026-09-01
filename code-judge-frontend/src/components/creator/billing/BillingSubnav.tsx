"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, ArrowLeftRight, Banknote, ShoppingBag, RotateCcw, Scale, FolderOpen, CreditCard } from "lucide-react";
import { cn } from "@/lib/helpers";

const BILLING_TABS = [
  { label: "Overview", href: "/creator/billing", icon: Wallet, exact: true },
  { label: "Earnings", href: "/creator/billing/earnings", icon: TrendingUp },
  { label: "Transactions", href: "/creator/billing/transactions", icon: ArrowLeftRight },
  { label: "Payouts", href: "/creator/billing/payouts", icon: Banknote },
  { label: "Products", href: "/creator/billing/products", icon: ShoppingBag },
  { label: "Refunds", href: "/creator/billing/refunds", icon: RotateCcw },
  { label: "Tax", href: "/creator/billing/tax", icon: Scale },
  { label: "Documents", href: "/creator/billing/documents", icon: FolderOpen },
  { label: "Payment Settings", href: "/creator/billing/settings", icon: CreditCard },
];

export function BillingSubnav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-16 z-10 -mx-4 border-b border-border bg-ai-bg/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BILLING_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                isActive ? "text-text-primary" : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="billingSubnavActive"
                  className="absolute inset-0 rounded-lg border border-pink-500/20 bg-pink-500/[0.08] dark:border-ai-accent/20 dark:bg-ai-accent-soft"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <tab.icon className={cn("relative z-10 h-3.5 w-3.5", isActive ? "text-pink-500 dark:text-ai-accent" : "text-text-muted")} />
              <span className="relative z-10">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
