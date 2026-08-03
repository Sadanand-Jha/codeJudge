"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface QuizWarpExperienceProps {
  code: string;
  onComplete: () => void;
  /** Total duration of the warp experience in ms (default 4000). */
  duration?: number;
  /** When true, immediately triggers the flash + onComplete. */
  forceComplete?: boolean;
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

export function QuizWarpExperience({ code, onComplete, duration = 4000, forceComplete = false }: QuizWarpExperienceProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"warp" | "portal" | "arrival">("warp");
  const [showFlash, setShowFlash] = useState(false);
  const warpRef = useRef<NodeJS.Timeout | null>(null);
  const portalRef = useRef<NodeJS.Timeout | null>(null);
  const arrivalRef = useRef<NodeJS.Timeout | null>(null);
  const flashRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);

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
          onComplete();
          router.push(`/quiz/${code}/waiting`);
        }, 300);
      }
      return;
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
          onComplete();
          router.push(`/quiz/${code}/waiting`);
        }, 300);
      }
    }, warpDuration + portalDuration + arrivalDuration - 300);

    return () => {
      if (warpRef.current) clearTimeout(warpRef.current);
      if (portalRef.current) clearTimeout(portalRef.current);
      if (arrivalRef.current) clearTimeout(arrivalRef.current);
      if (flashRef.current) clearTimeout(flashRef.current);
    };
  }, [code, onComplete, router, duration, warpDuration, portalDuration, arrivalDuration, forceComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#000005] overflow-hidden">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000010] via-[#050515] to-[#000008]" />

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
        </div>
      )}

      {/* No text overlay - pure cinematic experience */}

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