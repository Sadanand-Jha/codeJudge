"use client";

import { IceCreamCone, Rocket, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";

export function AuthThemeControls() {
  const { theme } = useTheme();
  const partyMode = theme === "light";

  return (
    <div className="fixed right-3 top-3 z-30 flex items-center gap-2 rounded-2xl border border-pink-200/80 bg-white/75 p-1.5 pl-3 shadow-[0_12px_34px_-22px_rgba(244,114,182,.7)] backdrop-blur-xl dark:border-violet-300/15 dark:bg-[#0D1222]/75 dark:shadow-[0_12px_36px_-22px_rgba(124,92,255,.8)] sm:right-5 sm:top-5">
      <span className={cn("hidden items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] min-[420px]:inline-flex", partyMode ? "text-pink-600" : "text-violet-300")}>
        {partyMode ? <IceCreamCone className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
        {partyMode ? "Party mode" : "Space mode"}
      </span>
      <ThemeToggle className={partyMode ? "border-pink-200 bg-pink-50" : "border-violet-300/15 bg-white/[0.04]"} />
    </div>
  );
}

export function AuthBrandMark({ className }: { className?: string }) {
  const { theme } = useTheme();
  const partyMode = theme === "light";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div className={cn("grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white", partyMode ? "from-pink-400 via-orange-400 to-amber-300 shadow-[0_12px_28px_-14px_rgba(244,114,182,.85)]" : "from-violet-500 via-indigo-500 to-blue-600 shadow-[0_12px_30px_-14px_rgba(124,92,255,.9)]")}>
        {partyMode ? <IceCreamCone className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
      </div>
      <span className="text-left leading-tight">
        <span className="block text-base font-extrabold tracking-tight text-text-primary">ByteClash</span>
        <span className={cn("mt-0.5 flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.16em]", partyMode ? "text-pink-500" : "text-violet-300/80")}>
          <Sparkles className="h-2.5 w-2.5" /> {partyMode ? "Quiz Party" : "Space Program"}
        </span>
      </span>
    </div>
  );
}
