"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { PREDEFINED_AVATARS } from "@/config/dicebear";
import { cn } from "@/lib/helpers";

const FLIGHT_PATHS = [
  { left: ["5%", "14%", "8%", "5%"], top: ["16%", "27%", "43%", "16%"], duration: 24, delay: 0, scale: 0.9, className: "hidden sm:block" },
  { left: ["90%", "82%", "94%", "90%"], top: ["18%", "34%", "48%", "18%"], duration: 28, delay: 2, scale: 1.05, className: "block" },
  { left: ["8%", "19%", "12%", "8%"], top: ["72%", "61%", "86%", "72%"], duration: 31, delay: 1, scale: 0.78, className: "hidden lg:block" },
  { left: ["91%", "78%", "86%", "91%"], top: ["69%", "82%", "58%", "69%"], duration: 26, delay: 4, scale: 0.84, className: "hidden md:block" },
  { left: ["24%", "31%", "18%", "24%"], top: ["8%", "14%", "11%", "8%"], duration: 34, delay: 3, scale: 0.68, className: "hidden xl:block" },
];

const SUIT_PALETTES = [
  { suit: "from-[#F8FAFC] to-[#CBD5E1]", trim: "bg-violet-500", glow: "rgba(139,124,255,.34)" },
  { suit: "from-[#EEF7FF] to-[#B8D7F0]", trim: "bg-cyan-500", glow: "rgba(34,211,238,.28)" },
  { suit: "from-[#FFF7ED] to-[#FED7AA]", trim: "bg-orange-500", glow: "rgba(251,146,60,.25)" },
  { suit: "from-[#F5F3FF] to-[#DDD6FE]", trim: "bg-fuchsia-500", glow: "rgba(217,70,239,.25)" },
  { suit: "from-[#ECFDF5] to-[#A7F3D0]", trim: "bg-emerald-500", glow: "rgba(52,211,153,.24)" },
] as const;

function Astronaut({ index }: { index: number }) {
  const avatar = PREDEFINED_AVATARS[index % PREDEFINED_AVATARS.length];
  const palette = SUIT_PALETTES[index % SUIT_PALETTES.length];

  return (
    <motion.div
      className="relative h-[112px] w-[82px] origin-center"
      animate={{ y: [0, -6, 0, 4, 0], rotate: [-2, 2, -1, 2, -2] }}
      transition={{ duration: 7 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.45 }}
      style={{ filter: `drop-shadow(0 0 18px ${palette.glow})` }}
    >
      {/* Life-support backpack */}
      <div className="absolute left-1 top-[48px] h-[43px] w-[20px] rounded-lg border border-slate-400/40 bg-slate-500/70 shadow-inner dark:bg-[#283149]" />

      {/* Arms */}
      <div className={`absolute left-[2px] top-[54px] h-[42px] w-[18px] origin-top rotate-[18deg] rounded-full border border-slate-400/35 bg-gradient-to-b ${palette.suit}`}>
        <span className="absolute -bottom-1 left-1 h-4 w-4 rounded-full border border-slate-400/40 bg-slate-100" />
      </div>
      <div className={`absolute right-[2px] top-[54px] h-[42px] w-[18px] origin-top -rotate-[18deg] rounded-full border border-slate-400/35 bg-gradient-to-b ${palette.suit}`}>
        <span className="absolute -bottom-1 left-1 h-4 w-4 rounded-full border border-slate-400/40 bg-slate-100" />
      </div>

      {/* Suit body */}
      <div className={`absolute left-1/2 top-[45px] h-[55px] w-[54px] -translate-x-1/2 rounded-[18px_18px_14px_14px] border border-white/70 bg-gradient-to-br ${palette.suit} shadow-[inset_-8px_-7px_14px_rgba(71,85,105,.22)]`}>
        <div className="absolute left-1/2 top-2 h-5 w-8 -translate-x-1/2 rounded-md border border-slate-500/25 bg-[#202B46]/90 p-1 shadow-inner">
          <span className="block h-1 w-full rounded-full bg-cyan-300/70" />
          <span className="mt-1 block h-1 w-2/3 rounded-full bg-emerald-300/70" />
        </div>
        <span className={cn("absolute right-2 top-8 h-2.5 w-2.5 rounded-full ring-2 ring-white/70", palette.trim)} />
        <span className="absolute bottom-1.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-slate-500/25" />
      </div>

      {/* Boots */}
      <div className={`absolute bottom-0 left-[20px] h-[28px] w-[18px] rotate-[5deg] rounded-b-xl bg-gradient-to-b ${palette.suit}`}>
        <span className="absolute -bottom-1 -left-1 h-3 w-5 rounded-full bg-slate-600 dark:bg-[#35405C]" />
      </div>
      <div className={`absolute bottom-0 right-[20px] h-[28px] w-[18px] -rotate-[5deg] rounded-b-xl bg-gradient-to-b ${palette.suit}`}>
        <span className="absolute -bottom-1 h-3 w-5 rounded-full bg-slate-600 dark:bg-[#35405C]" />
      </div>

      {/* Helmet + avatar visor */}
      <div className="absolute left-1/2 top-0 z-10 h-[58px] w-[62px] -translate-x-1/2 rounded-[48%] border-[5px] border-slate-100 bg-gradient-to-br from-white to-slate-300 p-[3px] shadow-[inset_-5px_-5px_10px_rgba(71,85,105,.28),0_0_0_1px_rgba(148,163,184,.45)]">
        <div className="relative h-full w-full overflow-hidden rounded-[45%] border-2 border-violet-300/50 bg-[#11162B] shadow-[inset_0_0_12px_rgba(34,211,238,.3)]">
          <Image src={avatar.url} alt="" fill sizes="52px" className="object-cover" />
          <span className="absolute inset-x-1 top-1 h-2 rounded-full bg-white/20 blur-[1px]" />
        </div>
      </div>

      {/* Thruster pulse */}
      <motion.span
        className="absolute -bottom-5 left-1/2 h-6 w-3 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-cyan-200 via-blue-500 to-transparent blur-[1px]"
        animate={{ opacity: [0.2, 0.8, 0.25], scaleY: [0.55, 1.1, 0.65] }}
        transition={{ duration: 1.5 + index * 0.15, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

export default function AstronautAvatarFleet() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden overflow-hidden dark:block" aria-hidden="true">
      {FLIGHT_PATHS.map((path, index) => (
        <motion.div
          key={index}
          className={cn("absolute", path.className)}
          initial={{ left: path.left[0], top: path.top[0], opacity: 0 }}
          animate={reduceMotion ? { left: path.left[0], top: path.top[0], opacity: 0.6 } : { left: path.left, top: path.top, opacity: [0.35, 0.78, 0.5, 0.35] }}
          transition={reduceMotion ? { duration: 0.3 } : { duration: path.duration, delay: path.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ scale: path.scale, x: "-50%", y: "-50%" }}
        >
          <Astronaut index={index} />
        </motion.div>
      ))}
    </div>
  );
}
