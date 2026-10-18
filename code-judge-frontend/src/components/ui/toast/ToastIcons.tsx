"use client";

import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import type { ToastType } from "@/types/toast";

interface ToastIconProps {
  type: ToastType;
  className?: string;
}

export const toastTone: Record<
  ToastType,
  { solid: string; bubble: string; icon: string }
> = {
  success: { solid: "#13795b", bubble: "bg-[#13795b]", icon: "text-white" },
  error: { solid: "#c2303a", bubble: "bg-[#c2303a]", icon: "text-white" },
  warning: { solid: "#ffd23f", bubble: "bg-[#ffd23f]", icon: "text-[#1A1240]" },
  info: { solid: "#6a3df0", bubble: "bg-[#6a3df0]", icon: "text-white" },
  loading: { solid: "#6a3df0", bubble: "bg-[#6a3df0]", icon: "text-white" },
};

const iconMap: Record<ToastType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

export function ToastIcon({ type, className = "" }: ToastIconProps) {
  const Icon = iconMap[type];
  const isSpinner = type === "loading";
  const tone = toastTone[type];

  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border-2 border-[#1A1240] ${tone.bubble} ${className}`}
    >
      <Icon
        className={`h-[18px] w-[18px] ${tone.icon} ${isSpinner ? "animate-spin" : ""}`}
        strokeWidth={2.5}
      />
    </div>
  );
}
