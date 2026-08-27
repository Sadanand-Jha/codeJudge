"use client";
import { Users } from "lucide-react";

export function ControlsOverlay({ online, isDark }: { online:number, isDark:boolean }){
  return (
    <>
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none select-none hidden sm:flex items-center gap-2">
        <div className={`rounded-xl border px-2.5 py-1.5 backdrop-blur-xl text-[11px] leading-tight shadow-lg ${isDark? "bg-black/35 border-white/[0.08] text-white/85":"bg-white/80 border-black/[0.07] text-[#1a1a2e]"}`}>
          <div className="font-semibold flex gap-2 text-[11px]"><span>↑ ↓ ← → / W A S D</span><span className="opacity-55 font-medium">Move</span></div>
          <div className="font-semibold flex gap-2 mt-0.5 items-center"><span className="px-1 py-0 rounded bg-[#EC4899] text-white text-[10px] font-bold leading-none">E</span><span className="opacity-55 font-medium">Interact / Enter</span></div>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 z-20 pointer-events-none select-none sm:hidden">
        <div className={`rounded-full border px-2.5 py-1.5 flex items-center gap-1.5 backdrop-blur-xl shadow-lg ${isDark? "bg-black/35 border-white/[0.08] text-white":"bg-white/85 border-black/[0.06] text-[#1a1a2e]"}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
          <span className="text-xs font-bold flex items-center gap-1"><Users className="w-3.5 h-3.5"/>{online}</span>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 z-20 pointer-events-none select-none hidden sm:flex">
        <div className={`rounded-full border px-3 py-1.5 flex items-center gap-2 backdrop-blur-xl shadow-lg ${isDark? "bg-black/35 border-white/[0.08] text-white":"bg-white/85 border-black/[0.06] text-[#1a1a2e]"}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.7)]"/>
          <span className="text-xs font-bold flex items-center gap-1"><Users className="w-3 h-3 text-[#EC4899]"/>{online} online</span>
        </div>
      </div>
    </>
  );
}
