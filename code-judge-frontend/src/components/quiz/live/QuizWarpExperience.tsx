"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface QuizWarpExperienceProps {
  code: string;
  onComplete: () => void;
}

export function QuizWarpExperience({ code, onComplete }: QuizWarpExperienceProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"warp" | "portal" | "arrival">("warp");
  const [showFlash, setShowFlash] = useState(false);
  const warpRef = useRef<NodeJS.Timeout | null>(null);
  const portalRef = useRef<NodeJS.Timeout | null>(null);
  const arrivalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Phase 1: Pure warp speed (0-1.5 seconds)
    warpRef.current = setTimeout(() => {
      setPhase("portal");
    }, 1500);

    // Phase 2: Portal approach (1.5-3 seconds)
    portalRef.current = setTimeout(() => {
      setPhase("arrival");
    }, 3000);

    // Phase 3: Arrival transition (3-4 seconds)
    arrivalRef.current = setTimeout(() => {
      setShowFlash(true);
      setTimeout(() => {
        onComplete();
        router.push(`/quiz/${code}/waiting`);
      }, 300);
    }, 3500);

    return () => {
      if (warpRef.current) clearTimeout(warpRef.current);
      if (portalRef.current) clearTimeout(portalRef.current);
      if (arrivalRef.current) clearTimeout(arrivalRef.current);
    };
  }, [code, onComplete, router]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#000005] overflow-hidden">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000010] via-[#050515] to-[#000008]" />

      {/* Warp speed stars - CSS animated for smoothness */}
      {phase === "warp" && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: `${1 + Math.random() * 2}px`,
                height: `${20 + Math.random() * 50}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: "translate3d(0,0,0)",
                animation: `warpStar ${0.6 + Math.random() * 0.4}s linear infinite`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: 0,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Hyperspace tunnel - CSS animated */}
      {(phase === "warp" || phase === "portal") && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-cyan-300/70 rounded-full"
              style={{
                width: "2px",
                left: `${50 + (Math.random() - 0.5) * 100}%`,
                top: "50%",
                height: `${30 + Math.random() * 60}px`,
                transform: "translate3d(0,0,0)",
                animation: `warpLine ${0.5 + Math.random() * 0.2}s linear infinite`,
                animationDelay: `${Math.random() * 0.2}s`,
                opacity: 0,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Floating cosmic objects - CSS animated */}
      {(phase === "warp" || phase === "portal") && (
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
          {[...Array(5)].map((_, i) => (
            <div
              key={`asteroid-${i}`}
              className="absolute text-base opacity-40"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: "translate3d(0,0,0)",
                animation: `floatAsteroid ${2 + Math.random() * 1.5}s linear infinite`,
                animationDelay: `${Math.random() * 1.5}s`,
              } as React.CSSProperties}
            >
              🌑
            </div>
          ))}
        </div>
      )}

      {/* Portal - simplified for performance */}
      {phase === "portal" && (
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
        {showFlash && (
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
