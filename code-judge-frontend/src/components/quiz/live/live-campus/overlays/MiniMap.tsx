"use client";
import { HOUSES, ROADS, PLAZA } from "../world/worldData";
import { WORLD_W, WORLD_H } from "../types";
import { Player } from "../types";

export function MiniMap({ players, localId, isDark }: { players: Player[], localId:string, isDark:boolean }){
  // Cozy campus minimap — compact, shows only curated area
  const W = 176, H = 118;
  const bg = isDark ? "#142116" : "#E6F0D6";
  const campX = 400, campY = 80, campW = 2400, campH = 1600;
  const sx = (v:number)=> (v - campX) / campW * W;
  const sy = (v:number)=> (v - campY) / campH * H;
  return (
    <div className={`absolute top-3 right-3 z-20 rounded-2xl border backdrop-blur-xl overflow-hidden shadow-xl hidden lg:block ${isDark? "bg-black/45 border-white/10":"bg-white/90 border-black/10"}`}>
      <div className="px-2.5 py-1.5 flex items-center justify-between">
        <span className={`text-[10px] font-bold tracking-widest ${isDark?"text-white/80":"text-black/70"}`}>CAMPUS</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isDark?"bg-white/10 text-white/60":"bg-black/5 text-black/60"}`}>{players.length} online</span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        <rect x={0} y={0} width={W} height={H} fill={bg} rx={2} />
        {/* campus border */}
        <rect x={0} y={0} width={W} height={H} rx={8} fill="none" stroke={isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"} strokeWidth={1} />
        {/* top road — subtle */}
        {ROADS.filter(r=>r.type==="main").map((r,i)=>(
          <rect key={i} x={sx(r.x)} y={sy(r.y)} width={r.w/campW*W} height={Math.max(2, r.h/campH*H)} rx={2} fill={isDark?"#2f332f":"#D8CFC0"} opacity={0.92} />
        ))}
        {/* plaza */}
        <rect x={sx(PLAZA.x)} y={sy(PLAZA.y)} width={PLAZA.w/campW*W} height={PLAZA.h/campH*H} rx={3} fill={isDark?"#232a22":"#F3EAD6"} stroke={isDark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.08)"} strokeWidth={0.8} />
        <circle cx={sx(PLAZA.x+PLAZA.w/2)} cy={sy(PLAZA.y+PLAZA.h/2)} r={2} fill="#22C55E" stroke="white" strokeWidth={0.5} />
        {/* path hint — dotted line south from lab */}
        <line x1={sx(1600)} y1={sy(368)} x2={sx(1598)} y2={sy(820)} stroke={isDark?"rgba(255,255,255,0.18)":"rgba(0,0,0,0.12)"} strokeWidth={1.2} strokeDasharray="3 3" strokeLinecap="round" />
        {/* houses — hero lab larger */}
        {HOUSES.map(h=>{
          const x = sx(h.x), y=sy(h.y), w=h.w/campW*W, ht=h.h/campH*H;
          const isLab = h.id==="codingLab";
          const ww = isLab? 14: 9, hh= isLab? 9:6;
          const cx = x + w/2 - ww/2, cy = y+ht/2 - hh/2;
          const fill = isLab ? (isDark?"#6a3a1a":"#C94A32") : (h.color || "#E8D5B7");
          const stroke = isDark?"rgba(255,255,255,0.22)":"rgba(0,0,0,0.18)";
          return <g key={h.id}><rect x={cx} y={cy} width={ww} height={hh} rx={1.4} fill={fill} stroke={stroke} strokeWidth={0.8} />{isLab && <circle cx={cx+ww/2} cy={cy+hh/2} r={1} fill="white" opacity={0.92}/>}</g>;
        })}
        {/* players — limited */}
        {players.filter(p=> {
          const loc:any = (p as any)._loc ?? p.location ?? {type:"campus"};
          return loc.type==="campus";
        }).slice(0,60).map(p=>{
          const isLocal = p.id===localId;
          const x = sx(p.x), y=sy(p.y);
          if(x<0||x>W||y<0||y>H) return null;
          return (
            <g key={p.id}>
              {isLocal && <circle cx={x} cy={y} r={5} fill="rgba(236,72,153,0.16)" />}
              <circle cx={x} cy={y} r={isLocal?2.8:1.7} fill={isLocal?"#EC4899": isDark?"#38bdf8":"#2563eb"} stroke={isLocal?"white":"rgba(255,255,255,0.92)"} strokeWidth={isLocal?0.8:0.5} />
            </g>
          );
        })}
      </svg>
      <div className={`px-2 py-1 text-[8px] flex items-center gap-2 ${isDark?"text-white/55":"text-black/55"}`}>
        <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-[#C94A32] border border-black/15"/> Lab</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[#D8CFC0] border border-black/10"/> Path</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EC4899] border border-white"/> You</span>
      </div>
    </div>
  );
}
