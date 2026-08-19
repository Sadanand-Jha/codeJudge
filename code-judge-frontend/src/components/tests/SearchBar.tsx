"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Command } from "lucide-react";
import { cn } from "@/lib/helpers";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search exams, subjects, tests or teachers...",
  className,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={cn("relative w-full", className)}
    >
      <div
        className={cn(
          "relative flex h-[50px] items-center rounded-2xl border bg-card transition-all duration-200",
          focused
            ? "border-pink-500/50 shadow-[0_0_0_4px_rgba(236,72,153,0.12),0_8px_28px_rgba(236,72,153,0.12)] dark:border-ai-accent/50 dark:shadow-[0_0_0_4px_rgba(139,92,246,0.14),0_8px_28px_rgba(139,92,246,0.12)]"
            : "border-border hover:border-border-hover shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
        )}
      >
        <Search
          className={cn(
            "ml-4 h-[18px] w-[18px] shrink-0 transition-colors",
            focused ? "text-pink-500 dark:text-ai-accent" : "text-text-muted"
          )}
        />
        <input
          ref={ref}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="h-full w-full border-0 bg-transparent px-3 text-[15px] text-text-primary placeholder-text-muted focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none"
        />
        <kbd className="mr-3 hidden shrink-0 items-center gap-1 rounded-md border border-border bg-card-hover px-1.5 py-1 text-[10px] font-semibold text-text-muted sm:flex">
          <Command className="h-3 w-3" />
          K
        </kbd>
      </div>
    </form>
  );
}
