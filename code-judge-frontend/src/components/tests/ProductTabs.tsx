"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, ClipboardList, Trophy, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";

export type ProductId = "problems" | "tests" | "contests";

type ProductTab = {
  id: ProductId;
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  meta: string;
  accent: {
    card: string;
    icon: string;
    bar: string;
    text: string;
    badge: string;
    hover: string;
    hoverIcon: string;
    hoverArrow: string;
  };
};

/**
 * Per-product accent colors — the highlighted product always wears its own
 * identity (problems = violet, tests = pink, contests = amber) so the strip
 * reads correctly from any hub.
 */
const PRODUCTS: Record<ProductId, ProductTab> = {
  problems: {
    id: "problems",
    icon: Code2,
    title: "PROBLEMS",
    description: "Competitive programming, DSA and every exam, one hub.",
    href: "/problems",
    meta: "Live database",
    accent: {
      card: "border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-600/10 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]",
      icon: "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(139,92,246,0.35)]",
      bar: "bg-gradient-to-b from-blue-500 to-violet-600",
      text: "text-violet-600 dark:text-ai-accent",
      badge: "bg-violet-500/15 text-violet-600 dark:bg-ai-accent/15 dark:text-ai-accent",
      hover: "hover:border-violet-500/25",
      hoverIcon: "group-hover:text-violet-600 dark:group-hover:text-ai-accent",
      hoverArrow: "group-hover:text-violet-600 dark:group-hover:text-ai-accent",
    },
  },
  tests: {
    id: "tests",
    icon: ClipboardList,
    title: "TESTS",
    description: "Competitive exams and teacher-created test series.",
    href: "/tests",
    meta: "1,40,000+ tests",
    accent: {
      card: "border-pink-500/40 bg-gradient-to-br from-pink-500/10 to-violet-600/10 shadow-[0_0_0_1px_rgba(236,72,153,0.2)]",
      icon: "bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)]",
      bar: "bg-gradient-to-b from-pink-500 to-violet-600",
      text: "text-pink-500 dark:text-ai-accent",
      badge: "bg-pink-500/15 text-pink-500 dark:bg-ai-accent/15 dark:text-ai-accent",
      hover: "hover:border-pink-500/25",
      hoverIcon: "group-hover:text-pink-500 dark:group-hover:text-ai-accent",
      hoverArrow: "group-hover:text-pink-500 dark:group-hover:text-ai-accent",
    },
  },
  contests: {
    id: "contests",
    icon: Trophy,
    title: "CONTESTS",
    description: "Timed competitive programming and coding competitions.",
    href: "/contests",
    meta: "Weekly · Monthly · Live",
    accent: {
      card: "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-600/10 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]",
      icon: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_4px_14px_rgba(245,158,11,0.35)]",
      bar: "bg-gradient-to-b from-amber-500 to-orange-600",
      text: "text-amber-600 dark:text-amber-300",
      badge: "bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
      hover: "hover:border-amber-500/25",
      hoverIcon: "group-hover:text-amber-600 dark:group-hover:text-amber-300",
      hoverArrow: "group-hover:text-amber-600 dark:group-hover:text-amber-300",
    },
  },
};

/**
 * The three sibling products (Problems / Tests / Contests) shown as a shared
 * navigation strip on every hub page — the active product is highlighted with
 * its own accent color. `order` lets each hub keep its preferred ordering.
 * `active` may be omitted for hubs that orchestrate all three without being
 * one of them (e.g. Preparation).
 */
export function ProductTabs({
  active,
  order = ["problems", "tests", "contests"],
}: {
  active?: ProductId;
  order?: ProductId[];
}) {
  return (
    <div className="relative border-t border-border bg-card/40 px-5 py-4 sm:px-8 sm:py-5 lg:px-10">
      <div className="grid gap-3 sm:grid-cols-3">
        {order.map((id, i) => {
          const tab = PRODUCTS[id];
          const isActive = id === active;
          const a = tab.accent;
          const Icon = tab.icon;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 + i * 0.08 }}
            >
              <Link
                href={tab.href}
                className={cn(
                  "group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all duration-200",
                  isActive
                    ? a.card
                    : cn(
                        "border-border bg-card hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:hover:border-ai-accent/30",
                        a.hover,
                      ),
                )}
              >
                {isActive && <span className={cn("absolute left-0 top-0 h-full w-1", a.bar)} />}
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    isActive
                      ? a.icon
                      : cn("bg-card-hover text-text-secondary ring-1 ring-border", a.hoverIcon),
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("text-sm font-extrabold tracking-wide", isActive ? a.text : "text-text-primary")}>
                      {tab.title}
                    </span>
                    {isActive && (
                      <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", a.badge)}>
                        Viewing
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-text-secondary">{tab.description}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-text-muted">{tab.meta}</span>
                </span>
                <ArrowRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5",
                    a.hoverArrow,
                  )}
                />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}