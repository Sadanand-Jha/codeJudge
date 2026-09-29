"use client";

import { motion, useReducedMotion } from "framer-motion";
import { IceCreamCone, Lollipop, PartyPopper, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useIsMobile } from "@/hooks/useIsMobile";

const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 37 + 7) % 100}%`,
  top: `${(i * 53 + 11) % 94}%`,
  color: ["#FF66A8", "#7C6CFF", "#28C7E8", "#FFB82E", "#4DD59B"][i % 5],
  rotate: (i * 47) % 180,
  delay: (i % 8) * 0.25,
}));

const FLOATERS = [
  { Icon: IceCreamCone, left: "6%", top: "18%", color: "#FF66A8", bg: "#FFF0F6", rotate: -12, delay: 0 },
  { Icon: Lollipop, left: "91%", top: "24%", color: "#7C6CFF", bg: "#F0EDFF", rotate: 14, delay: 0.8 },
  { Icon: PartyPopper, left: "9%", top: "74%", color: "#FF9F1C", bg: "#FFF5DE", rotate: 10, delay: 1.6 },
  { Icon: Sparkles, left: "88%", top: "76%", color: "#17BFA3", bg: "#E8FFF9", rotate: -10, delay: 2.2 },
] as const;

function WaterBalloon({ className, color, delay }: { className: string; color: string; delay: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={cn("absolute h-16 w-14 rounded-[52%_48%_48%_52%] border-2 border-white/80 shadow-[inset_-10px_-8px_14px_rgba(56,34,100,.13),0_12px_30px_-16px_rgba(61,39,145,.4)]", className)}
      style={{ background: color }}
      animate={reduceMotion ? undefined : { y: [0, -12, 0], rotate: [-5, 6, -5] }}
      transition={{ duration: 5.5, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="absolute left-3 top-2 h-4 w-2 rotate-[-25deg] rounded-full bg-white/45 blur-[1px]" />
      <span className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm" style={{ background: color }} />
    </motion.div>
  );
}

export default function QuizPartyAtmosphere({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Mobile / touch: static candy wash only. The 30 confetti loops, floating
  // icons, balloons and large blurred powder clouds keep the main thread and
  // GPU compositor busy during scroll and input — the top mobile jank source.
  if (isMobile) {
    return (
      <div className={cn("pointer-events-none absolute inset-0 overflow-hidden dark:hidden", className)} aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#fff9ef_0%,#fff3fb_33%,#eef9ff_67%,#f3fff8_100%)] opacity-95" />
        <div className="absolute inset-x-0 bottom-0 h-3 bg-[linear-gradient(90deg,#ff66a8_0_12.5%,#ffb82e_12.5%_25%,#37cce8_25%_37.5%,#7c6cff_37.5%_50%,#4dd59b_50%_62.5%,#ff66a8_62.5%_75%,#ffb82e_75%_87.5%,#37cce8_87.5%)] opacity-70" />
      </div>
    );
  }

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden dark:hidden", className)} aria-hidden="true">
      {/* Candy-sky wash */}
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#fff9ef_0%,#fff3fb_33%,#eef9ff_67%,#f3fff8_100%)] opacity-95" />
      <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,.95) 0 2px, transparent 2.5px)", backgroundSize: "34px 34px" }} />

      {/* Holi powder clouds and water splashes */}
      <div className="absolute -left-24 top-[7%] h-72 w-72 rounded-full bg-[#FF60A8]/20 blur-[65px]" />
      <div className="absolute -right-28 top-[28%] h-80 w-80 rounded-full bg-[#22C8F6]/20 blur-[70px]" />
      <div className="absolute bottom-[-8rem] left-[24%] h-80 w-80 rounded-full bg-[#FFD23F]/22 blur-[68px]" />
      <div className="absolute bottom-[10%] right-[20%] h-64 w-64 rounded-full bg-[#7657FF]/16 blur-[64px]" />

      <div className="absolute -left-14 top-[35%] h-40 w-40 rounded-full border-[18px] border-cyan-400/10">
        <span className="absolute -right-7 top-4 h-10 w-10 rounded-full bg-cyan-400/15" />
        <span className="absolute right-2 -top-8 h-7 w-7 rounded-full bg-blue-400/15" />
        <span className="absolute bottom-0 -right-10 h-5 w-5 rounded-full bg-violet-400/15" />
      </div>
      <div className="absolute -right-12 bottom-[18%] h-36 w-36 rounded-full border-[16px] border-pink-400/10">
        <span className="absolute -left-8 top-1 h-9 w-9 rounded-full bg-pink-400/15" />
        <span className="absolute -left-4 bottom-0 h-5 w-5 rounded-full bg-orange-400/18" />
      </div>

      {/* Balloons */}
      <WaterBalloon className="left-[3%] top-[48%] hidden sm:block" color="linear-gradient(145deg,#61DCF4,#2999E8)" delay={0.2} />
      <WaterBalloon className="right-[3%] top-[47%] hidden md:block" color="linear-gradient(145deg,#FF8BC0,#F04D91)" delay={1.2} />
      <WaterBalloon className="right-[15%] top-[8%] hidden lg:block scale-75" color="linear-gradient(145deg,#FFD95C,#FF9D30)" delay={2} />

      {/* Party objects around the safe content edges */}
      {FLOATERS.map(({ Icon, left, top, color, bg, rotate, delay }, index) => (
        <motion.div
          key={index}
          className="quiz-party-floater absolute hidden h-14 w-14 items-center justify-center rounded-[20px] border-2 border-white/80 shadow-[0_14px_34px_-18px_rgba(87,53,143,.5)] sm:flex"
          style={{ left, top, color, background: bg, rotate }}
          animate={reduceMotion ? undefined : { y: [0, -9, 0, 5, 0], rotate: [rotate, rotate + 7, rotate - 4, rotate] }}
          transition={{ duration: 6 + index, delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-7 w-7" strokeWidth={2.3} />
        </motion.div>
      ))}

      {/* Confetti sprinkles */}
      {CONFETTI.map((piece, index) => (
        <motion.span
          key={index}
          className="quiz-party-confetti absolute h-1.5 w-3 rounded-full opacity-65"
          style={{ left: piece.left, top: piece.top, backgroundColor: piece.color, rotate: piece.rotate }}
          animate={reduceMotion ? undefined : { y: [0, 8, 0], rotate: [piece.rotate, piece.rotate + 45, piece.rotate] }}
          transition={{ duration: 4 + (index % 4), delay: piece.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Bottom party bunting */}
      <div className="absolute inset-x-0 bottom-0 h-3 bg-[linear-gradient(90deg,#ff66a8_0_12.5%,#ffb82e_12.5%_25%,#37cce8_25%_37.5%,#7c6cff_37.5%_50%,#4dd59b_50%_62.5%,#ff66a8_62.5%_75%,#ffb82e_75%_87.5%,#37cce8_87.5%)] opacity-70" />
    </div>
  );
}
