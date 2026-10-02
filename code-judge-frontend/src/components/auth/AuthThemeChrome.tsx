"use client";

import { BrainCircuit, CheckCircle2, IceCreamCone, Rocket, ShieldCheck, Sparkles, WandSparkles, Zap } from "lucide-react";
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

export function AuthBottomStrip({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-20 h-2 bg-[linear-gradient(90deg,#ff66a8_0_12.5%,#ffb82e_12.5%_25%,#37cce8_25%_37.5%,#7c6cff_37.5%_50%,#4dd59b_50%_62.5%,#ff66a8_62.5%_75%,#ffb82e_75%_87.5%,#37cce8_87.5%)] shadow-[0_-8px_28px_rgba(124,108,255,.12)] dark:bg-[linear-gradient(90deg,#7c3aed,#2563eb,#0891b2,#7c3aed)]",
        className
      )}
    />
  );
}

export function AuthShowcasePanel({ mode }: { mode: "login" | "register" }) {
  const { theme } = useTheme();
  const partyMode = theme === "light";

  return (
    <section className="relative hidden min-h-[620px] overflow-hidden rounded-[34px] border border-white/75 bg-white/55 p-8 shadow-[0_34px_100px_-54px_rgba(91,69,196,.65)] backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#0B1020]/70 dark:shadow-[0_34px_110px_-48px_rgba(49,33,120,.8)] lg:flex lg:flex-col lg:justify-between xl:p-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(99,102,241,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.7) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 shadow-sm dark:border-violet-300/15 dark:bg-violet-500/10 dark:text-violet-200">
          <Sparkles className="h-3.5 w-3.5" /> AI-native quiz workspace
        </span>
        <h2 className="mt-6 max-w-lg text-[40px] font-black leading-[1.02] tracking-[-0.045em] text-[#161B2A] dark:text-white xl:text-[48px]">
          {mode === "register" ? "One account. Two powerful ways to learn." : "Welcome back to your intelligent quiz workspace."}
        </h2>
        <p className="mt-5 max-w-lg text-sm leading-7 text-[#596176] dark:text-[#A7B0C2]">
          {mode === "register"
            ? "Choose your path and ByteClash shapes the experience around you—from focused practice to AI-assisted quiz creation."
            : "Jump back into live quizzes, instant results, and an AI-assisted creation studio built to keep every session moving."}
        </p>
      </div>

      <div className="relative my-8 rounded-[26px] border border-white/80 bg-white/70 p-4 shadow-[0_24px_60px_-38px_rgba(79,70,229,.7)] dark:border-white/[0.08] dark:bg-white/[0.045]">
        <div className="flex items-center gap-3">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,.9)]">
            <BrainCircuit className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[#20263A] dark:text-white">ByteClash AI</p>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">Ready</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[#687086] dark:text-[#8F9AAF]">Tell me your topic and I&rsquo;ll help turn it into a polished quiz flow.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Generate", "Explain", "Evaluate"].map((item, index) => (
            <span key={item} className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-200/70 bg-violet-50/75 px-2 py-2 text-[9px] font-bold text-violet-700 dark:border-violet-300/10 dark:bg-violet-500/[0.07] dark:text-violet-200">
              {index === 0 ? <WandSparkles className="h-3 w-3" /> : index === 1 ? <Zap className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{item}
            </span>
          ))}
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-3">
        {[
          { icon: WandSparkles, label: "AI-assisted", detail: "creation" },
          { icon: Zap, label: "Instant", detail: "feedback" },
          { icon: ShieldCheck, label: "Secure", detail: "sessions" },
        ].map(({ icon: Icon, label, detail }) => (
          <div key={label} className="rounded-2xl border border-white/75 bg-white/55 p-3 text-center dark:border-white/[0.07] dark:bg-white/[0.035]">
            <Icon className={cn("mx-auto h-4 w-4", partyMode ? "text-pink-500" : "text-violet-300")} />
            <p className="mt-2 text-[10px] font-black text-[#30374B] dark:text-white">{label}</p>
            <p className="mt-0.5 text-[9px] text-[#8991A3] dark:text-[#687386]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
