"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Rocket, ShieldCheck, IceCreamCone, PartyPopper } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useIsMobile } from "@/hooks/useIsMobile";

interface QuizWarpExperienceProps {
  code: string;
  onComplete: () => void;
  /** Total duration of the warp experience in ms (default 4000). */
  duration?: number;
  /** When true, immediately triggers the flash + onComplete. */
  forceComplete?: boolean;
  /** Destination after the sequence. Defaults to the waiting room. */
  destination?: string;
  quizName?: string;
}

// Pre-computed random star data (avoids Math.random in render)
interface StarData {
  width: number;
  height: number;
  left: number;
  top: number;
  animDuration: number;
  animDelay: number;
}

interface LineData {
  left: number;
  height: number;
  animDuration: number;
  animDelay: number;
}

interface AsteroidData {
  left: number;
  top: number;
  animDuration: number;
  animDelay: number;
}

export function QuizWarpExperience({
  code,
  onComplete,
  duration = 4000,
  forceComplete = false,
  destination = `/quiz/${code}/waiting`,
  quizName,
}: QuizWarpExperienceProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<"warp" | "portal" | "arrival">("warp");
  const [showFlash, setShowFlash] = useState(false);
  const warpRef = useRef<NodeJS.Timeout | null>(null);
  const portalRef = useRef<NodeJS.Timeout | null>(null);
  const arrivalRef = useRef<NodeJS.Timeout | null>(null);
  const flashRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Proportional phase timings based on total duration
  const warpDuration = duration * 0.4;       // 40% of duration
  const portalDuration = duration * 0.4;      // 40% of duration
  const arrivalDuration = duration * 0.2;     // 20% of duration

  // Derive effective phase/flash from forceComplete to avoid setState in effect
  const effectivePhase = forceComplete ? "arrival" : phase;
  const effectiveShowFlash = forceComplete || showFlash;

  // Pre-compute random values to avoid impure calls during render
  const [stars] = useState<StarData[]>(() =>
    Array.from({ length: 50 }, () => ({
      width: 1 + Math.random() * 2,
      height: 20 + Math.random() * 50,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animDuration: 0.6 + Math.random() * 0.4,
      animDelay: Math.random() * 0.5,
    })));

  const [lines] = useState<LineData[]>(() =>
    Array.from({ length: 30 }, () => ({
      left: 50 + (Math.random() - 0.5) * 100,
      height: 30 + Math.random() * 60,
      animDuration: 0.5 + Math.random() * 0.2,
      animDelay: Math.random() * 0.2,
    })));

  const [asteroids] = useState<AsteroidData[]>(() =>
    Array.from({ length: 5 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animDuration: 2 + Math.random() * 1.5,
      animDelay: Math.random() * 1.5,
    })));

  useEffect(() => {
    if (forceComplete) {
      // Force complete: just trigger the completion timer (no setState needed)
      if (!completedRef.current) {
        completedRef.current = true;
        flashRef.current = setTimeout(() => {
          onCompleteRef.current();
          router.push(destination);
        }, 300);
      }
      return;
    }

    // Mobile fast-path: skip the 5.6s warp cinematic (dozens of full-screen
    // loops + blurred portal). Brief static splash, then straight through.
    if (isMobile) {
      if (!completedRef.current) {
        completedRef.current = true;
        flashRef.current = setTimeout(() => {
          onCompleteRef.current();
          router.push(destination);
        }, 600);
      }
      return () => {
        if (flashRef.current) clearTimeout(flashRef.current);
      };
    }

    // Phase 1: Pure warp speed
    warpRef.current = setTimeout(() => {
      setPhase("portal");
    }, warpDuration);

    // Phase 2: Portal approach
    portalRef.current = setTimeout(() => {
      setPhase("arrival");
    }, warpDuration + portalDuration);

    // Phase 3: Arrival transition
    arrivalRef.current = setTimeout(() => {
      setShowFlash(true);
      if (!completedRef.current) {
        completedRef.current = true;
        flashRef.current = setTimeout(() => {
          onCompleteRef.current();
          router.push(destination);
        }, 300);
      }
    }, warpDuration + portalDuration + arrivalDuration - 300);

    return () => {
      if (warpRef.current) clearTimeout(warpRef.current);
      if (portalRef.current) clearTimeout(portalRef.current);
      if (arrivalRef.current) clearTimeout(arrivalRef.current);
      if (flashRef.current) clearTimeout(flashRef.current);
    };
  }, [destination, router, duration, warpDuration, portalDuration, arrivalDuration, forceComplete, isMobile]);

  // Mobile: static handoff splash — no stars, emojis, portal blur or letterbox.
  if (isMobile) {
    const light = theme === "light";
    return (
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center px-6 text-center ${light ? "bg-[#FFF8EF]" : "bg-[#000005]"}`}
        role="status"
        aria-label="Entering quiz"
      >
        <div>
          <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-[3px] border-violet-500/20 border-t-violet-500" />
          <p className={`mt-5 text-[10px] font-bold uppercase tracking-[0.3em] ${light ? "text-pink-600" : "text-cyan-200/70"}`}>
            Entering quiz
          </p>
          <p className={`mx-auto mt-3 max-w-md text-xl font-bold tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
            {quizName || "Your quiz is ready"}
          </p>
        </div>
      </div>
    );
  }

  if (theme === "light") {
    return (
      <div className="fixed inset-0 z-[100] overflow-hidden bg-[#FFF8EF]">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#fff7e9_0%,#ffeef8_32%,#eafaff_68%,#effff7_100%)]" />
        <div className="absolute -left-24 top-[8%] h-80 w-80 rounded-full bg-pink-300/35 blur-[70px]" />
        <div className="absolute -right-24 top-[22%] h-80 w-80 rounded-full bg-cyan-300/30 blur-[70px]" />
        <div className="absolute bottom-[-8rem] left-[25%] h-80 w-80 rounded-full bg-amber-300/30 blur-[70px]" />

        {stars.slice(0, 34).map((s, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${5 + (i % 3) * 3}px`,
              height: `${2 + (i % 2) * 2}px`,
              backgroundColor: ["#FF65A5", "#7C6CFF", "#22C8E5", "#FFB62E", "#43D39E"][i % 5],
              rotate: `${i * 37}deg`,
            }}
            animate={{ y: [0, 18, 4], rotate: [i * 37, i * 37 + 90] }}
            transition={{ duration: 2.2 + (i % 4) * 0.35, delay: s.animDelay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <AnimatePresence>
          {effectivePhase === "warp" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1.03, 1.08] }}
              exit={{ opacity: 0 }}
              transition={{ duration: Math.max(1.8, warpDuration / 1000), times: [0, 0.18, 0.78, 1] }}
              className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center"
            >
              <div>
                <motion.div animate={{ rotate: [-6, 6, -6], y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] border-4 border-white bg-gradient-to-br from-pink-400 via-orange-300 to-amber-300 text-white shadow-[0_22px_55px_-18px_rgba(244,114,182,.75)]">
                  <IceCreamCone className="h-9 w-9" />
                </motion.div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-pink-600">Party pass accepted</p>
                <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">{quizName || "Your quiz treat awaits"}</h2>
                <p className="mt-3 text-xs font-bold tracking-[0.16em] text-violet-500">SPRINKLES · SPLASHES · BIG SMILES</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(effectivePhase === "warp" || effectivePhase === "portal") && (
          <div className="absolute inset-0">
            {["🎈", "🍭", "🍦", "💦", "🎉", "🍬"].map((item, i) => (
              <motion.span
                key={item}
                className="absolute text-4xl drop-shadow-lg sm:text-5xl"
                style={{ left: `${8 + i * 17}%`, top: `${18 + (i % 3) * 24}%` }}
                animate={{ y: ["35vh", "-35vh"], x: [0, i % 2 ? 35 : -35], rotate: [0, i % 2 ? 25 : -25] }}
                transition={{ duration: 3.4 + i * 0.25, delay: i * 0.18, repeat: Infinity, ease: "linear" }}
              >{item}</motion.span>
            ))}
          </div>
        )}

        {effectivePhase === "portal" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 5, 13], opacity: [0, 0.9, 1] }} transition={{ duration: Math.max(1.4, portalDuration / 1000), ease: "easeIn" }} className="h-40 w-40 rounded-full bg-[conic-gradient(from_45deg,#ff70ad,#ffca52,#45d7ef,#8b7cff,#ff70ad)] opacity-75 blur-[10px]" />
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: [0, 1.2, 2.2], rotate: [-30, 8, 25] }} transition={{ duration: Math.max(1.4, portalDuration / 1000), ease: "easeOut" }} className="absolute text-8xl">🍨</motion.div>
          </div>
        )}

        {effectivePhase === "arrival" && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: [0.8, 1.05, 1] }} className="absolute inset-0 z-30 flex items-center justify-center px-6 text-center">
            <div className="rounded-[36px] border-4 border-white bg-white/75 px-8 py-9 shadow-[0_30px_90px_-28px_rgba(139,92,246,.55)] backdrop-blur-xl">
              <PartyPopper className="mx-auto h-12 w-12 text-pink-500" />
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-pink-600">Ready, set, quiz!</p>
              <p className="mt-2 text-lg font-bold text-slate-800">Let the colorful fun begin</p>
            </div>
          </motion.div>
        )}

        {effectiveShowFlash && <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.35 }} className="absolute inset-0 z-50 bg-white" />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#000005] overflow-hidden">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000010] via-[#050515] to-[#000008]" />

      {/* Cinematic letterbox */}
      <motion.div initial={{ height: "12vh" }} animate={{ height: effectivePhase === "arrival" ? 0 : "7vh" }} className="absolute inset-x-0 top-0 z-40 bg-black" />
      <motion.div initial={{ height: "12vh" }} animate={{ height: effectivePhase === "arrival" ? 0 : "7vh" }} className="absolute inset-x-0 bottom-0 z-40 bg-black" />

      {/* Opening mission title */}
      <AnimatePresence>
        {effectivePhase === "warp" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.96, 1, 1.02, 1.04] }}
            exit={{ opacity: 0 }}
            transition={{ duration: Math.max(1.8, warpDuration / 1000), times: [0, 0.18, 0.76, 1] }}
            className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center"
          >
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_45px_rgba(34,211,238,.22)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.42em] text-cyan-200/70">Mission access granted</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-4xl">{quizName || "Your assessment awaits"}</h2>
              <p className="mt-3 font-mono text-[10px] tracking-[0.28em] text-white/40">FLIGHT {code.slice(0, 4)} · SECURE CHANNEL</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warp speed stars - CSS animated for smoothness */}
      {effectivePhase === "warp" && (
        <div className="absolute inset-0 overflow-hidden">
          {stars.map((s, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: `${s.width}px`,
                height: `${s.height}px`,
                left: `${s.left}%`,
                top: `${s.top}%`,
                transform: "translate3d(0,0,0)",
                animation: `warpStar ${s.animDuration}s linear infinite`,
                animationDelay: `${s.animDelay}s`,
                opacity: 0,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Hyperspace tunnel - CSS animated */}
      {(effectivePhase === "warp" || effectivePhase === "portal") && (
        <div className="absolute inset-0 overflow-hidden">
          {lines.map((l, i) => (
            <div
              key={i}
              className="absolute bg-cyan-300/70 rounded-full"
              style={{
                width: "2px",
                left: `${l.left}%`,
                top: "50%",
                height: `${l.height}px`,
                transform: "translate3d(0,0,0)",
                animation: `warpLine ${l.animDuration}s linear infinite`,
                animationDelay: `${l.animDelay}s`,
                opacity: 0,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Floating cosmic objects - CSS animated */}
      {(effectivePhase === "warp" || effectivePhase === "portal") && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Planets */}
          {[...Array(2)].map((_, i) => (
            <div
              key={`planet-${i}`}
              className="absolute text-3xl opacity-50"
              style={{
                left: `${20 + i * 50}%`,
                top: `${15 + i * 20}%`,
                transform: "translate3d(0,0,0)",
                animation: `floatPlanet ${5 + i * 2}s linear infinite`,
                animationDelay: `${i * 2}s`,
              } as React.CSSProperties}
            >
              {i === 0 ? "🪐" : "🔵"}
            </div>
          ))}

          {/* Asteroids */}
          {asteroids.map((a, i) => (
            <div
              key={`asteroid-${i}`}
              className="absolute text-base opacity-40"
              style={{
                left: `${a.left}%`,
                top: `${a.top}%`,
                transform: "translate3d(0,0,0)",
                animation: `floatAsteroid ${a.animDuration}s linear infinite`,
                animationDelay: `${a.animDelay}s`,
              } as React.CSSProperties}
            >
              🌑
            </div>
          ))}
        </div>
      )}

      {/* Portal - simplified for performance */}
      {effectivePhase === "portal" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative w-32 h-32"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 12, 16],
              opacity: [0, 1, 1],
            }}
            transition={{
              duration: 1.5,
              ease: "easeIn",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full blur-[50px] opacity-70" />
            <div className="absolute inset-0 bg-white rounded-full blur-[30px] opacity-60" />
          </motion.div>
          <motion.div
            initial={{ y: "65vh", scale: 0.55, opacity: 0 }}
            animate={{ y: ["65vh", "10vh", "-8vh"], scale: [0.55, 1, 0.35], opacity: [0, 1, 1] }}
            transition={{ duration: Math.max(1.5, portalDuration / 1000), ease: [0.4, 0, 0.2, 1] }}
            className="absolute z-20 text-white drop-shadow-[0_0_22px_rgba(103,232,249,.9)]"
          >
            <Rocket className="h-14 w-14 rotate-[-45deg] sm:h-20 sm:w-20" />
            <span className="absolute left-1/2 top-full h-28 w-5 -translate-x-1/2 bg-gradient-to-b from-cyan-200/80 via-violet-400/35 to-transparent blur-md" />
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {effectivePhase === "arrival" && !effectiveShowFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-30 flex items-center justify-center px-6 text-center"
          >
            <div>
              <motion.div
                animate={{ boxShadow: ["0 0 25px rgba(139,124,255,.2)", "0 0 70px rgba(139,124,255,.55)", "0 0 25px rgba(139,124,255,.2)"] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="mx-auto h-2 w-2 rounded-full bg-white"
              />
              <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.45em] text-violet-200/75">Destination reached</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-5xl">WELCOME ABOARD</h2>
              <p className="mt-3 text-xs text-white/45">Preparing your secure quiz environment…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final white flash */}
      <AnimatePresence>
        {effectiveShowFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-white z-50"
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes warpStar {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 100vh, 0);
            opacity: 0;
          }
        }

        @keyframes warpLine {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translate3d(0, 100vh, 0);
            opacity: 0;
          }
        }

        @keyframes floatPlanet {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0.5;
          }
          100% {
            transform: translate3d(0, 100vh, 0);
            opacity: 0;
          }
        }

        @keyframes floatAsteroid {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0.4;
          }
          100% {
            transform: translate3d(-30px, 100vh, 0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
