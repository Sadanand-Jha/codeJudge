"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CreditCard,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  ScrollText,
  Settings2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { DemoBadge, NoteBanner, TabLinks } from "@/components/platform/ai-ops/primitives";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/platform/ai-ops", label: "Overview", icon: LayoutDashboard },
  { href: "/platform/ai-ops/models", label: "Models", icon: Boxes },
  { href: "/platform/ai-ops/routing", label: "Routing", icon: GitBranch },
  { href: "/platform/ai-ops/usage", label: "Usage & costs", icon: BarChart3 },
  { href: "/platform/ai-ops/logs", label: "Request logs", icon: ScrollText },
  { href: "/platform/ai-ops/access", label: "User access", icon: Users },
  { href: "/platform/ai-ops/credits", label: "Credits & billing", icon: CreditCard },
  { href: "/platform/ai-ops/budgets", label: "Budgets & limits", icon: Wallet },
  { href: "/platform/ai-ops/health", label: "Health & alerts", icon: HeartPulse },
  { href: "/platform/ai-ops/settings", label: "Settings", icon: Settings2 },
];

export default function AiOpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/platform/ai-ops" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="qs-ui -mx-4 -mt-5 min-h-[70vh] bg-[var(--qs-bg)] px-4 pb-10 pt-4 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
      <div className="sticky top-[60px] z-30 -mx-4 mb-5 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)]/95 px-4 pb-3 pt-3 backdrop-blur-md md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="qs-display text-[17px] font-extrabold tracking-[-0.01em] text-[var(--qs-ink)]">
              AI Operations
            </span>
            <DemoBadge />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[12px] font-bold text-[var(--qs-muted)] md:inline">
              Sample workspace · no live provider calls
            </span>
            <Link href="/platform" className="b sm b-ghost">
              <ArrowLeft size={13} />
              Owner console
            </Link>
          </div>
        </div>
        <div className="-mx-1 mt-2.5 overflow-x-auto pb-0.5 pl-1 pr-1">
          <TabLinks tabs={TABS} isActive={isActive} />
        </div>
      </div>

      <NoteBanner tone="info">
        <strong className="font-extrabold">Demo data.</strong> Every metric, model, user and transaction in this
        section is realistic sample data for review — nothing is fetched from providers and no billing action is live.
        Write actions are disabled until backend integration lands.
      </NoteBanner>

      <div className="mt-5 space-y-6">{children}</div>
    </div>
  );
}
