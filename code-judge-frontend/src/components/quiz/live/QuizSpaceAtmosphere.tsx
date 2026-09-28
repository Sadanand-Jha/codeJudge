import { Rocket } from "lucide-react";
import { cn } from "@/lib/helpers";
import QuizPartyAtmosphere from "./QuizPartyAtmosphere";

/**
 * Shared dark-mode-only space layer for the student quiz journey.
 * It stays deliberately low-contrast so content remains the visual priority.
 */
export default function QuizSpaceAtmosphere({ className }: { className?: string }) {
  return (
    <>
    <QuizPartyAtmosphere className={className} />
    <div className={cn("pointer-events-none absolute inset-0 hidden overflow-hidden dark:block", className)} aria-hidden="true">
      <div className="absolute left-1/2 top-[46%] h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-200/[0.04]" />
      <div className="absolute left-1/2 top-[48%] h-[28rem] w-[68rem] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-[50%] border border-cyan-100/[0.035]" />

      <div className="absolute -right-12 top-[12%] h-36 w-36 rounded-full bg-gradient-to-br from-violet-300/45 via-violet-600/35 to-[#21104d]/60 opacity-50 shadow-[inset_-18px_-14px_28px_rgba(7,5,20,.7),0_0_70px_rgba(124,58,237,.13)]">
        <span className="absolute left-[20%] top-[25%] h-4 w-4 rounded-full bg-white/[0.07]" />
        <span className="absolute bottom-[22%] right-[22%] h-6 w-6 rounded-full border border-white/[0.05] bg-black/10" />
        <span className="absolute left-1/2 top-1/2 h-[142%] w-[190%] -translate-x-1/2 -translate-y-1/2 rotate-[-17deg] rounded-[50%] border-[3px] border-violet-100/10 border-l-violet-100/30" />
      </div>

      <div className="absolute bottom-[13%] left-[7%] grid h-9 w-9 place-items-center rounded-full border border-cyan-100/[0.08] bg-[#07142a]/35 text-cyan-100/25 shadow-[0_0_30px_rgba(34,211,238,.08)]">
        <Rocket className="h-4 w-4 rotate-45" />
      </div>

      <span className="absolute left-[8%] top-[15%] h-1 w-1 rounded-full bg-white/45 shadow-[0_0_9px_rgba(255,255,255,.55)]" />
      <span className="absolute left-[19%] top-[30%] h-1.5 w-1.5 rounded-full bg-cyan-100/35 shadow-[0_0_12px_rgba(165,243,252,.45)]" />
      <span className="absolute right-[19%] top-[9%] h-1 w-1 rounded-full bg-violet-100/50 shadow-[0_0_10px_rgba(237,233,254,.45)]" />
      <span className="absolute bottom-[18%] right-[12%] h-1.5 w-1.5 rounded-full bg-violet-200/40 shadow-[0_0_12px_rgba(196,181,253,.45)]" />
      <span className="absolute bottom-[10%] left-[31%] h-1 w-1 rounded-full bg-white/35 shadow-[0_0_8px_rgba(255,255,255,.4)]" />
    </div>
    </>
  );
}
