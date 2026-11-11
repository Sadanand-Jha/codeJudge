"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/helpers";

const TABS = [
  { label: "Quizzes", href: "/creator/quizzes", icon: ListChecks, match: (p: string) => p === "/creator/quizzes" || p.startsWith("/creator/quizzes/") },
  // { label: "Results", href: "/creator/analytics", icon: BarChart3, match: (p: string) => p === "/creator/analytics" || p.startsWith("/creator/analytics/") },
  { label: "Community", href: "/creator/resources", icon: UsersRound, match: (p: string) => p === "/creator/resources" || p.startsWith("/creator/resources/") },
  { label: "Profile", href: "/creator/profile", icon: UserRound, match: (p: string) => p === "/creator/profile" || p.startsWith("/creator/profile/") },
];

export default function CreatorMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Creator Studio"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <ul className="mx-auto grid max-w-[430px] grid-cols-3 gap-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-[12px] text-[12px] font-bold transition-colors active:scale-[0.97]",
                  active ? "text-[var(--qs-brand)]" : "text-[var(--qs-muted)]"
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
