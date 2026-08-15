"use client";

import { useState } from "react";
import { ChevronDown, ListOrdered } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { TocItem } from "./article";

/**
 * Table of contents. Renders as a sticky left rail on desktop and a compact
 * collapsible dropdown above the article on mobile/tablet.
 */
export default function ArticleToc({
  toc,
  activeId,
  onNavigate,
  variant,
}: {
  toc: TocItem[];
  activeId: string | null;
  onNavigate: (id: string) => void;
  variant: "rail" | "dropdown";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "rail") {
    return (
      <nav
        aria-label="In this article"
        className="rounded-2xl border border-border bg-card p-4"
      >
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          <ListOrdered className="h-3.5 w-3.5 text-[#8B5CF6]" />
          In this article
        </p>
        <ul className="mt-3 space-y-0.5 border-l border-border">
          {toc.map((item) => {
            const active = activeId === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.id);
                  }}
                  className={cn(
                    "-ml-px flex items-center gap-2 border-l-2 py-1.5 pl-3 text-[12px] transition-colors",
                    item.level === 3 ? "pl-6" : "",
                    active
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/[0.06] font-semibold text-[#7C3AED] dark:text-[#A78BFA]"
                      : "border-transparent text-text-secondary hover:border-[#8B5CF6]/40 hover:text-text-primary"
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  const activeLabel = toc.find((t) => t.id === activeId)?.label ?? "Jump to section";

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
          <ListOrdered className="h-3.5 w-3.5 text-[#8B5CF6]" />
          In this article
        </span>
        <span className="flex items-center gap-2">
          <span className="truncate text-[11px] font-medium text-text-secondary">{activeLabel}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="mt-1.5 rounded-xl border border-border bg-card p-2">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                onNavigate(item.id);
              }}
              className={cn(
                "block rounded-lg px-3 py-1.5 text-[12.5px] transition-colors",
                item.level === 3 ? "pl-7" : "",
                activeId === item.id
                  ? "bg-[#8B5CF6]/[0.08] font-semibold text-[#7C3AED] dark:text-[#A78BFA]"
                  : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}