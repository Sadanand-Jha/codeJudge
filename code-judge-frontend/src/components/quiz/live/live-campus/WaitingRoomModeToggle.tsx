"use client";
import { cn } from "@/lib/helpers";

export function WaitingRoomModeToggle({ mode, onChange, isDark }: { mode: "classic"|"live-campus", onChange:(m:"classic"|"live-campus")=>void, isDark:boolean }){
  return (
    <div className={`inline-flex items-center rounded-full border p-1 backdrop-blur-xl ${isDark? "bg-white/[0.05] border-white/10":"bg-black/[0.04] border-black/10"}`}>
      <button
        onClick={()=>onChange("classic")}
        className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-colors", mode==="classic" ? "bg-[#EC4899] text-white shadow" : isDark? "text-white/60 hover:text-white":"text-black/60 hover:text-black")}
      >Classic</button>
      <button
        onClick={()=>onChange("live-campus")}
        className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-colors", mode==="live-campus" ? "bg-[#EC4899] text-white shadow" : isDark? "text-white/60 hover:text-white":"text-black/60 hover:text-black")}
      >Live Campus</button>
    </div>
  );
}
