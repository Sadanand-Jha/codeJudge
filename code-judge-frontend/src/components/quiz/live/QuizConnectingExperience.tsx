"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface QuizConnectingExperienceProps {
  code: string;
  onComplete: () => void;
}

const STATUS_MESSAGES = [
  "Initializing Quantum Connection...",
  "Scanning Quiz Universe...",
  "Finding Active Players...",
  "Synchronizing Knowledge Network...",
  "Establishing Secure Connection...",
  "Matching Skill Levels...",
  "Reserving Quiz Arena...",
  "Finalizing Session...",
  "Connection Established!",
];

export function QuizConnectingExperience({ code, onComplete }: QuizConnectingExperienceProps) {
  const router = useRouter();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [phase, setPhase] = useState<"warp" | "connecting" | "victory" | "transition">("warp");
  const [showFlash, setShowFlash] = useState(false);
  const [rocketStage, setRocketStage] = useState<"enter" | "board" | "warp" | "exit">("enter");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warpRef = useRef<NodeJS.Timeout | null>(null);
  const rocketTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Phase 1: Warp speed effect (0-2 seconds)
    warpRef.current = setTimeout(() => {
      setPhase("connecting");
    }, 2000);

    // Cycle through status messages (2-8 seconds)
    intervalRef.current = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev >= STATUS_MESSAGES.length - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    // Phase 2: Victory moment with rocket sequence (8-11 seconds)
    const victoryTimer = setTimeout(() => {
      setPhase("victory");
    }, 8000);

    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setRocketStage("enter"), 8500));
    timers.push(setTimeout(() => setRocketStage("board"), 9000));
    timers.push(setTimeout(() => setRocketStage("warp"), 9500));
    timers.push(setTimeout(() => setRocketStage("exit"), 10500));
    rocketTimersRef.current = timers;

    // Phase 3: Transition (11-12 seconds)
    const transitionTimer = setTimeout(() => {
      setPhase("transition");
      setShowFlash(true);

      setTimeout(() => {
        onComplete();
        router.push(`/quiz/${code}/waiting`);
      }, 300);
    }, 11000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (warpRef.current) clearTimeout(warpRef.current);
      rocketTimersRef.current.forEach(clearTimeout);
      clearTimeout(victoryTimer);
      clearTimeout(transitionTimer);
    };
  }, [code, onComplete, router]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#000011] overflow-hidden">
      {/* Deep space background with stars */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#000022] via-[#0a0a2e] to-[#000011]" />

        {/* Nebula clouds */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#4f46e5] rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#7c3aed] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#06b6d4] rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        {/* Stars layer */}
        <div className="absolute inset-0">
          {[...Array(200)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Warp speed effect */}
        {phase === "warp" && (
          <div className="absolute inset-0">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={`warp-${i}`}
                className="absolute w-0.5 bg-gradient-to-b from-transparent via-white to-transparent"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  height: `${20 + Math.random() * 40}px`,
                }}
                animate={{
                  y: ["0vh", "100vh"],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1 + Math.random() * 0.5,
                  repeat: Infinity,
                  delay: Math.random() * 0.5,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        )}

        {/* Constellation network lines */}
        {phase === "connecting" && (
          <div className="absolute inset-0 opacity-40">
            <svg className="w-full h-full">
              {[...Array(8)].map((_, i) => (
                <motion.line
                  key={`line-${i}`}
                  x1={`${Math.random() * 100}%`}
                  y1={`${Math.random() * 100}%`}
                  x2={`${Math.random() * 100}%`}
                  y2={`${Math.random() * 100}%`}
                  stroke="url(#gradient)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* Shooting stars */}
        {(phase === "connecting" || phase === "victory") && (
          <div className="absolute inset-0">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`shooting-${i}`}
                className="absolute w-20 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
                style={{
                  left: `${Math.random() * 80}%`,
                  top: `${Math.random() * 50}%`,
                }}
                animate={{
                  x: ["0vw", "100vw"],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 2 + Math.random() * 2,
                }}
              />
            ))}
          </div>
        )}

        {/* Floating rockets and space objects */}
        {(phase === "connecting" || phase === "victory") && (
          <div className="absolute inset-0">
            {/* Background rockets (parallax) */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`rocket-bg-${i}`}
                className="absolute text-xl opacity-40"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, 50 + Math.random() * 100],
                  y: [0, -30 + Math.random() * 60],
                }}
                transition={{
                  duration: 12 + Math.random() * 6,
                  repeat: Infinity,
                  delay: i * 3,
                  ease: "linear",
                }}
              >
                🚀
              </motion.div>
            ))}

            {/* Foreground rockets */}
            {[...Array(2)].map((_, i) => (
              <motion.div
                key={`rocket-fg-${i}`}
                className="absolute text-3xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, 150 + Math.random() * 150],
                  y: [0, -80 + Math.random() * 160],
                  rotate: [0, 15, -15, 0],
                }}
                transition={{
                  duration: 6 + Math.random() * 3,
                  repeat: Infinity,
                  delay: i * 2.5,
                  ease: "linear",
                }}
              >
                🚀
              </motion.div>
            ))}

            {/* Asteroids */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`asteroid-${i}`}
                className="absolute text-xl opacity-60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, -100],
                  y: [0, 50],
                }}
                transition={{
                  duration: 12 + Math.random() * 6,
                  repeat: Infinity,
                  delay: i * 1.5,
                  ease: "linear",
                }}
              >
                🌑
              </motion.div>
            ))}

            {/* Planets */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`planet-${i}`}
                className="absolute text-3xl"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${10 + i * 20}%`,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 4 + i * 2,
                  repeat: Infinity,
                }}
              >
                {i === 0 ? "🪐" : i === 1 ? "🔵" : "🟣"}
              </motion.div>
            ))}

            {/* Comets */}
            {[...Array(2)].map((_, i) => (
              <motion.div
                key={`comet-${i}`}
                className="absolute text-lg"
                style={{
                  left: `${Math.random() * 60}%`,
                  top: `${Math.random() * 40}%`,
                }}
                animate={{
                  x: ["0vw", "120vw"],
                  y: [0, 100],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  delay: i * 3 + Math.random() * 2,
                  ease: "linear",
                }}
              >
                ☄️
              </motion.div>
            ))}
          </div>
        )}

        {/* Hyperspace tunnel effect during victory/transition */}
        {(phase === "victory" || phase === "transition") && (
          <div className="absolute inset-0">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={`hyperspace-${i}`}
                className="absolute w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent"
                style={{
                  left: `${50 + (Math.random() - 0.5) * 100}%`,
                  top: "50%",
                  height: `${50 + Math.random() * 100}px`,
                }}
                animate={{
                  y: ["-50vh", "50vh"],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1 + Math.random() * 0.5,
                  repeat: Infinity,
                  delay: Math.random() * 0.3,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Center connection core */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="relative w-64 h-64">
          {/* Outer rotating rings */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-purple-400/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-8 rounded-full border border-cyan-300/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Pulsing energy rings */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`pulse-${i}`}
              className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.7,
              }}
            />
          ))}

          {/* Orbital indicator */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#06b6d4]" />
          </motion.div>

          {/* Center core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className={`w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 ${
                phase === "victory" ? "shadow-[0_0_80px_#fbbf24]" : "shadow-[0_0_40px_#06b6d4]"
              }`}
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: phase === "victory"
                  ? ["0 0 40px #fbbf24", "0 0 80px #fbbf24", "0 0 40px #fbbf24"]
                  : ["0 0 40px #06b6d4", "0 0 60px #06b6d4", "0 0 40px #06b6d4"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
          </div>
        </div>
      </div>

      {/* Cinematic Rocket Sequence */}
      {phase === "victory" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <AnimatePresence>
            {rocketStage === "enter" && (
              <motion.div
                initial={{ x: "100vw", y: 0, scale: 0.5, opacity: 0 }}
                animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                exit={{ x: 0, y: 0, scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute text-8xl"
              >
                🚀
              </motion.div>
            )}

            {rocketStage === "board" && (
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute text-8xl"
              >
                🚀
              </motion.div>
            )}

            {rocketStage === "warp" && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0.5], opacity: [0, 1, 0] }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute text-9xl"
              >
                🚀
              </motion.div>
            )}

            {rocketStage === "exit" && (
              <motion.div
                initial={{ y: 0, scale: 1 }}
                animate={{ y: "-100vh", scale: 0.5 }}
                transition={{ duration: 1.5, ease: "easeIn" }}
                className="absolute text-9xl"
              >
                🚀
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Status message */}
      <div className="absolute bottom-24 left-0 right-0 z-20 text-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessageIndex}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: phase === "victory" && currentMessageIndex === STATUS_MESSAGES.length - 1 ? 1.2 : 1,
            }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className={`font-semibold drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] ${
              phase === "victory" && currentMessageIndex === STATUS_MESSAGES.length - 1
                ? "text-3xl text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]"
                : "text-lg text-cyan-300"
            }`}
          >
            {STATUS_MESSAGES[currentMessageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Victory celebration effects */}
      {phase === "victory" && (
        <div className="absolute inset-0 z-15 pointer-events-none">
          {/* Golden glow from center */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-400/20 rounded-full blur-[100px]"
            animate={{
              scale: [1, 1.5, 2],
              opacity: [0.3, 0.6, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />

          {/* Celebration particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`confetti-${i}`}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                left: `${50 + (Math.random() - 0.5) * 40}%`,
                top: `${50 + (Math.random() - 0.5) * 40}%`,
              }}
              animate={{
                x: [(Math.random() - 0.5) * 200],
                y: [(Math.random() - 0.5) * 200],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}

      {/* Flash overlay for transition */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-50"
          />
        )}
      </AnimatePresence>
    </div>
  );
}