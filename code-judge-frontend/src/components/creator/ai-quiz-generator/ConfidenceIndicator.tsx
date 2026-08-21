"use client";

import { cn } from "@/lib/helpers";
import { Check, AlertTriangle, HelpCircle } from "lucide-react";

const config = {
  high: {
    label: "High confidence",
    icon: Check,
    cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  medium: {
    label: "Medium confidence — review recommended",
    icon: AlertTriangle,
    cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  low: {
    label: "Low confidence — needs review",
    icon: HelpCircle,
    cls: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
};

export function ConfidenceIndicator({
  level,
  className,
}: {
  level: "high" | "medium" | "low";
  className?: string;
}) {
  const c = config[level];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        c.cls,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
