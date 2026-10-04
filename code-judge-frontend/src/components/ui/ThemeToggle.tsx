"use client";

import { motion } from "framer-motion";
import { flushSync } from "react-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";

export default function ThemeToggle({ className, variant = "pill" }: { className?: string; variant?: "pill" | "icon" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const handleThemeChange = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> };
    };

    if (!reduceMotion && viewTransitionDocument.startViewTransition) {
      viewTransitionDocument.startViewTransition(() => {
        flushSync(() => toggleTheme());
      });
      return;
    }

    toggleTheme();
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleThemeChange}
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:text-text-primary",
          className
        )}
        aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
        title={`Switch to ${isDark ? "light" : "dark"} theme`}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleThemeChange}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full border border-border bg-card transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      role="switch"
      aria-checked={isDark ? "false" : "true"}
    >
      {/* Moon icon — left side, active in dark mode */}
      <Moon
        className={cn(
          "absolute left-1.5 z-10 h-3.5 w-3.5 transition-colors duration-200",
          isDark ? "text-muted-foreground" : "text-text-muted"
        )}
      />
      {/* Sun icon — right side, active in light mode */}
      <Sun
        className={cn(
          "absolute right-1.5 z-10 h-3.5 w-3.5 transition-colors duration-200",
          isDark ? "text-text-muted" : "text-[#F59E0B]"
        )}
      />

      {/* Sliding thumb — no icon inside, just a clean pill */}
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full shadow-md",
          isDark ? "left-0.5 bg-card-hover" : "left-[30px] bg-white"
        )}
      />
    </button>
  );
}
