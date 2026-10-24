"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { LayoutGrid, RefreshCw, Users } from "lucide-react";
import { cn } from "@/lib/helpers";

export interface RoomsSubNavItem {
  id: string;
  name: string;
  href: string;
  active: boolean;
  disabled?: boolean;
}

interface RoomsSubNavbarProps {
  items: RoomsSubNavItem[];
  homeHref: string;
  homeActive?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

/**
 * Horizontal rooms switcher shared by the student rooms section and the
 * creator (studio) rooms section. Rendered as a second navbar under the app
 * header so students/teachers can jump between rooms without scrolling
 * through stacked cards.
 */
export default function RoomsSubNavbar({
  items,
  homeHref,
  homeActive = false,
  loading = false,
  error = null,
  onRetry,
  action,
  className,
}: RoomsSubNavbarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeId = items.find((item) => item.active)?.id ?? null;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const target =
      container.scrollLeft +
      activeRect.left -
      containerRect.left -
      (container.clientWidth - activeRect.width) / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeId, items.length]);

  return (
    <nav
      aria-label="My rooms"
      className={cn(
        "border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--qs-surface)]/85",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-2 px-3 py-2 sm:px-4">
        <Link
          href={homeHref}
          aria-current={homeActive ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-extrabold transition-colors",
            homeActive
              ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
              : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>My Rooms</span>
        </Link>

        <span aria-hidden className="h-5 w-0.5 shrink-0 rounded-full bg-[var(--qs-line)]" />

        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <span key={index} className="app-skeleton h-9 w-28 shrink-0 rounded-full" />
            ))
          ) : error ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-[var(--qs-bad)] px-3 text-xs font-bold text-[var(--qs-bad)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          ) : items.length === 0 ? (
            <span className="inline-flex h-9 shrink-0 items-center gap-1.5 px-2 text-xs font-semibold text-[var(--qs-muted)]">
              <Users className="h-3.5 w-3.5" />
              No rooms yet
            </span>
          ) : (
            items.map((item) => {
              const className = cn(
                "inline-flex h-9 max-w-[190px] shrink-0 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-bold transition-colors",
                item.active
                  ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
                  : item.disabled
                    ? "cursor-not-allowed border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)] opacity-70"
                    : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
              );

              if (item.disabled) {
                return (
                  <span
                    key={item.id}
                    aria-disabled="true"
                    title={`${item.name} (archived)`}
                    className={className}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a85d00]" />
                    <span className="truncate">{item.name}</span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-active={item.active ? "true" : undefined}
                  aria-current={item.active ? "page" : undefined}
                  className={className}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      item.active ? "bg-[var(--qs-on-brand)]" : "bg-[var(--qs-ok)]"
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })
          )}
        </div>

        {action}
      </div>
    </nav>
  );
}
