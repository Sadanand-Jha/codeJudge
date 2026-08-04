"use client";

import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import type { ToastType } from "@/types/toast";

interface ToastIconProps {
  type: ToastType;
  className?: string;
}

const iconMap: Record<ToastType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const iconColorMap: Record<ToastType, string> = {
  success: "text-[#22C55E]",
  error: "text-[#EF4444]",
  warning: "text-[#F59E0B]",
  info: "text-[#3B82F6]",
  loading: "text-[#7C3AED]",
};

const iconBgMap: Record<ToastType, string> = {
  success: "bg-[#22C55E]/10",
  error: "bg-[#EF4444]/10",
  warning: "bg-[#F59E0B]/10",
  info: "bg-[#3B82F6]/10",
  loading: "bg-[#7C3AED]/10",
};

export function ToastIcon({ type, className = "" }: ToastIconProps) {
  const Icon = iconMap[type];
  const isSpinner = type === "loading";

  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBgMap[type]} ${className}`}
    >
      <Icon
        className={`h-[18px] w-[18px] ${iconColorMap[type]} ${isSpinner ? "animate-spin" : ""}`}
        strokeWidth={2.5}
      />
    </div>
  );
}