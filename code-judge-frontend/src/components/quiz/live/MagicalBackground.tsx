"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export function MagicalBackground() {
  const stars = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 1.5,
        duration: 4 + Math.random() * 4,
        delay: Math.random() * 3,
        opacity: 0.2 + Math.random() * 0.3,
      })),
    []
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 3 + Math.random() * 3,
        duration: 10 + Math.random() * 6,
        delay: Math.random() * 4,
        opacity: 0.05 + Math.random() * 0.08,
      })),
    []
  );

  const doodles = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        left: 15 + Math.random() * 70,
        top: 15 + Math.random() * 70,
        emoji: ["🚀", "⭐", "📚"][i],
        duration: 18 + Math.random() * 8,
        delay: Math.random() * 5,
        size: 16 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Nebula gradients - static, no animation for performance */}
      <div
        className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.06), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -right-32 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.04), transparent 70%)" }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Stars */}
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
          }}
          animate={{
            opacity: [s.opacity, s.opacity * 2, s.opacity],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#EC4899]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            filter: "blur(1px)",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Doodles */}
      {doodles.map((d) => (
        <motion.div
          key={d.id}
          className="absolute"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            fontSize: d.size,
            opacity: 0.08,
          }}
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: d.duration,
            delay: d.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {d.emoji}
        </motion.div>
      ))}
    </div>
  );
}

export default MagicalBackground;