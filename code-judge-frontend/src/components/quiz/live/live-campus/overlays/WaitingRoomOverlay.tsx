"use client";
import { Clock, Users, Hash, Sparkles } from "lucide-react";

export function WaitingRoomOverlay({ quizName, ready, total, startsIn, isDark, roomCode }: { quizName:string, ready:number, total:number, startsIn:string, isDark:boolean, roomCode?: string }){
  return (
    <>
      {/* Top-left: Waiting status + quiz title — glass card */}
      <div className="absolute left-3 top-3 z-20 pointer-events-none select-none max-w-[72vw] sm:max-w-none">
        <div className={`rounded-2xl backdrop-blur-xl border px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.10)] ${isDark? "bg-[#0f0f12]/70 border-white/[0.08]": "bg-white/82 border-black/[0.07]"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDark? "text-white/55":"text-black/45"}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            Waiting Room • Live Campus
          </p>
          <p className={`text-[13px] font-bold leading-tight mt-0.5 truncate ${isDark? "text-white":"text-[#1a1a2e]"}`}>{quizName}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2 py-0.5 border ${isDark?"bg-white/[0.06] border-white/10 text-white":"bg-black/[0.04] border-black/10 text-[#1a1a2e]"}`}>
              <Users className="w-3 h-3 text-[#EC4899]"/>{ready} / {total}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${isDark?"bg-white/[0.04] border-white/10 text-white/70":"bg-black/[0.03] border-black/10 text-black/60"}`}>
              <Clock className="w-3 h-3 text-amber-500"/>{startsIn}
            </span>
            {roomCode && (
              <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold rounded-full px-2 py-0.5 border ${isDark?"bg-amber-500/10 border-amber-500/20 text-amber-300":"bg-amber-500/10 border-amber-500/20 text-amber-700"}`}>
                <Hash className="w-3 h-3"/>{roomCode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top-right: Room Code (mobile shows here) + Legend — glass pills */}
      <div className="absolute right-3 top-[148px] z-20 pointer-events-none select-none hidden sm:flex flex-col items-end gap-2">
        <div className={`rounded-xl border px-2.5 py-1.5 backdrop-blur-xl shadow-lg flex items-center gap-2 ${isDark? "bg-[#0f0f12]/60 border-white/10 text-white/80":"bg-white/80 border-black/10 text-black/70"}`}>
          <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />
          <span className="text-[11px] font-semibold">Coding Campus</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">Live</span>
        </div>
      </div>

      {/* Bottom-left: Legend — glass card, responsive hide on very small */}
      <div className="absolute left-3 bottom-[52px] sm:bottom-3 z-20 pointer-events-none select-none hidden sm:block">
        <div className={`rounded-xl border px-3 py-2 backdrop-blur-xl shadow-lg ${isDark? "bg-[#0f1410]/65 border-white/[0.08]":"bg-white/82 border-black/[0.07]"}`}>
          <p className={`text-[10px] font-bold tracking-widest ${isDark?"text-white/60":"text-black/50"}`}>LEGEND</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#F59E0B]"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white shadow"/> Waiting</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow"/> Moving</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#EC4899]"><span className="w-2.5 h-2.5 rounded-full bg-[#EC4899] border-2 border-white shadow"/> You</span>
          </div>
          <p className={`text-[10px] mt-1 ${isDark?"text-white/45":"text-black/45"}`}>Tip: hover an avatar • Press <span className="px-1 rounded bg-[#EC4899] text-white text-[10px] font-bold">E</span> to interact</p>
        </div>
      </div>
    </>
  );
}
