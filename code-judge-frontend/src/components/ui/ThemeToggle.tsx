"use client";

import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full border border-border bg-card transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      role="switch"
      aria-checked={!isDark}
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