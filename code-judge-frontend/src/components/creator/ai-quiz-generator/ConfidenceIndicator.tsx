"use client";

import { cn } from "@/lib/helpers";
import { Check, AlertTriangle, HelpCircle } from "lucide-react";

const config = {
  high: {
    label: "High confidence",
    icon: Check,
    cls: "text-[var(--qs-ok)] bg-[var(--qs-ok)]/10 border-[var(--qs-ok)]/25",
  },
  medium: {
    label: "Medium confidence — review recommended",
    icon: AlertTriangle,
    cls: "text-[#a85d00] bg-[#a85d00]/10 border-[#a85d00]/25",
  },
  low: {
    label: "Low confidence — needs review",
    icon: HelpCircle,
    cls: "text-[var(--qs-bad)] bg-[var(--qs-bad)]/10 border-[var(--qs-bad)]/25",
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
        "inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-bold",
        c.cls,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
