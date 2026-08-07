'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useWaitingRoomTheme } from '@/context/WaitingRoomThemeContext'

/**
 * ThemeBackground — renders the animated background for the active waiting room theme.
 * Uses layered rendering: far background → mid layer → foreground particles.
 * All animations use CSS transforms and Framer Motion for 60 FPS performance.
 */
export function ThemeBackground() {
  const { activeConfig, activeEvents } = useWaitingRoomTheme()
  const themeId = activeConfig.id

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{
          background: `linear-gradient(135deg, ${activeConfig.bgGradient[0]}, ${activeConfig.bgGradient[1]}, ${activeConfig.bgGradient[2]})`,
        }}
      />

      {/* Theme-specific layers */}
      {themeId === 'deep-space' && <DeepSpaceBackground />}
      {themeId === 'ai-cloud' && <AICloudBackground />}
      {themeId === 'cyber-city' && <CyberCityBackground />}
      {themeId === 'floating-islands' && <FloatingIslandsBackground />}
      {themeId === 'ancient-temple' && <AncientTempleBackground />}
      {themeId === 'underwater' && <UnderwaterBackground />}
      {themeId === 'cherry-blossom' && <CherryBlossomBackground />}
      {themeId === 'winter' && <WinterBackground />}
      {themeId === 'volcano' && <VolcanoBackground />}
      {themeId === 'hacker-matrix' && <HackerMatrixBackground />}
      {themeId === 'fantasy-forest' && <FantasyForestBackground />}
      {themeId === 'space-station' && <SpaceStationBackground />}

      {/* Dynamic events overlay */}
      {activeEvents.map((event) => (
        <DynamicEventOverlay key={event.id} type={event.type} intensity={event.intensity} />
      ))}
    </div>
  )
}

/* ============================================
   Deep Space 🌌
   ============================================ */
function DeepSpaceBackground() {
  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 0.5 + Math.random() * 2,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.5,
    })), [])

  const asteroids = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 8 + Math.random() * 12,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * 10,
    })), [])

  return (
    <>
      {/* Stronger center glow for text readability */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
        style={{ background: 'radial-gradient(ellipse, rgba(88,80,236,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      {/* Nebula glows - reduced opacity */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08), transparent 70%)', filter: 'blur(70px)' }} />

      {/* Aurora glow */}
      <motion.div
        animate={{ opacity: [0.05, 0.12, 0.05], x: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[20%] left-[10%] w-[300px] h-[200px] rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)', filter: 'blur(40px)' }}
      />

      {/* Stars - slightly brighter */}
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.opacity * 0.7 }}
          animate={{ opacity: [s.opacity * 0.7, s.opacity * 1.2, s.opacity * 0.7], scale: [1, 1.3, 1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Floating asteroids - reduced opacity */}
      {asteroids.map((a) => (
        <motion.div
          key={a.id}
          className="absolute rounded-full"
          style={{
            left: `${a.left}%`, top: `${a.top}%`,
            width: a.size, height: a.size,
            background: 'radial-gradient(circle, rgba(139,92,246,0.2), rgba(0,0,0,0.2))',
            boxShadow: '0 0 8px rgba(139,92,246,0.15)',
          }}
          animate={{ y: [0, -15, 0], rotate: [0, 360], x: [0, 10, 0] }}
          transition={{ duration: a.duration, delay: a.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Distant planet - softer glow */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[15%] top-[15%] w-16 h-16 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #8B5CF6, #4C1D95 60%, #2E1065)',
          boxShadow: '0 0 20px rgba(139,92,246,0.2)',
        }}
      />
    </>
  )
}

/* ============================================
   AI Cloud ☁️
   ============================================ */
function AICloudBackground() {
  const bubbles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 60 + Math.random() * 120,
      duration: 8 + Math.random() * 8,
      delay: Math.random() * 4,
      hue: ['rgba(168,85,247,0.12)', 'rgba(236,72,153,0.10)', 'rgba(59,130,246,0.08)'][i % 3],
    })), [])

  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 6 + Math.random() * 6,
      delay: Math.random() * 3,
    })), [])

  return (
    <>
      {/* Soft gradient blobs */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-32 -top-32 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)', filter: 'blur(60px)' }}
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -right-40 top-1/4 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.12), transparent 70%)', filter: 'blur(70px)' }}
      />

      {/* Glass bubbles */}
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          className="absolute rounded-full"
          style={{
            left: `${b.left}%`, top: `${b.top}%`,
            width: b.size, height: b.size,
            background: b.hue,
            border: `1px solid ${b.hue.replace('0.1', '0.2')}`,
            backdropFilter: 'blur(8px)',
          }}
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`, top: `${p.top}%`,
            width: p.size, height: p.size,
            background: p.id % 3 === 0 ? 'rgba(168,85,247,0.4)' : p.id % 3 === 1 ? 'rgba(236,72,153,0.35)' : 'rgba(59,130,246,0.3)',
          }}
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Light beams */}
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[15%] top-[-20%] w-[80px] h-[140%]"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(168,85,247,0.08), transparent)', transform: 'rotate(15deg)' }}
      />
    </>
  )
}

/* ============================================
   Cyber City 🌃
   ============================================ */
function CyberCityBackground() {
  const buildings = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: i * 8.5,
      height: 30 + Math.random() * 50,
      width: 4 + Math.random() * 3,
      color: ['#A855F7', '#22D3EE', '#EC4899'][i % 3],
    })), [])

  const windows = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 60,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
    })), [])

  const vehicles = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      top: 20 + Math.random() * 50,
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 10,
      color: ['#22D3EE', '#EC4899', '#A855F7'][i],
    })), [])

  return (
    <>
      {/* City skyline */}
      <div className="absolute bottom-0 left-0 right-0 h-[50%]">
        {buildings.map((b) => (
          <div
            key={b.id}
            className="absolute bottom-0"
            style={{
              left: `${b.left}%`,
              height: `${b.height}%`,
              width: `${b.width}%`,
              background: `linear-gradient(to top, ${b.color}22, ${b.color}11)`,
              borderTop: `1px solid ${b.color}44`,
            }}
          />
        ))}
      </div>

      {/* Building windows */}
      {windows.map((w) => (
        <motion.div
          key={w.id}
          className="absolute w-1 h-1 rounded-sm"
          style={{ left: `${w.left}%`, top: `${w.top}%`, background: '#22D3EE' }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: w.duration, delay: w.delay, repeat: Infinity }}
        />
      ))}

      {/* Flying vehicles */}
      {vehicles.map((v) => (
        <motion.div
          key={v.id}
          className="absolute w-3 h-1.5 rounded-full"
          style={{ top: `${v.top}%`, background: v.color, boxShadow: `0 0 8px ${v.color}` }}
          animate={{ x: ['-10vw', '110vw'] }}
          transition={{ duration: v.duration, delay: v.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Neon billboards */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute right-[20%] top-[15%] px-3 py-1 rounded border border-[#22D3EE]/40 text-[8px] font-bold text-[#22D3EE]"
        style={{ background: 'rgba(34,211,238,0.1)', textShadow: '0 0 10px rgba(34,211,238,0.5)' }}
      >
        BYTECLASH
      </motion.div>
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        className="absolute left-[15%] top-[25%] px-3 py-1 rounded border border-[#EC4899]/40 text-[8px] font-bold text-[#EC4899]"
        style={{ background: 'rgba(236,72,153,0.1)', textShadow: '0 0 10px rgba(236,72,153,0.5)' }}
      >
        AI QUIZ
      </motion.div>

      {/* Rain reflections */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] opacity-20"
        style={{ background: 'linear-gradient(to top, rgba(34,211,238,0.1), transparent)' }} />
    </>
  )
}

/* ============================================
   Floating Islands 🏔️
   ============================================ */
function FloatingIslandsBackground() {
  const clouds = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 40 + Math.random() * 60,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * 8,
    })), [])

  const birds = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      top: 20 + Math.random() * 40,
      duration: 12 + Math.random() * 8,
      delay: Math.random() * 5,
    })), [])

  return (
    <>
      {/* Sun rays */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[300px]"
        style={{ background: 'linear-gradient(to bottom, rgba(255,200,100,0.3), transparent)', filter: 'blur(20px)' }}
      />

      {/* Floating islands */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[15%] top-[20%] w-32 h-20 rounded-t-[50%] rounded-b-lg"
        style={{ background: 'linear-gradient(to bottom, #10B981, #059669)', boxShadow: '0 8px 30px rgba(16,185,129,0.3)' }}
      />
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute right-[20%] top-[35%] w-40 h-24 rounded-t-[50%] rounded-b-lg"
        style={{ background: 'linear-gradient(to bottom, #3B82F6, #2563EB)', boxShadow: '0 8px 30px rgba(59,130,246,0.3)' }}
      />

      {/* Waterfall from island */}
      <motion.div
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute left-[22%] top-[30%] w-1 h-20"
        style={{ background: 'linear-gradient(to bottom, rgba(59,130,246,0.6), transparent)' }}
      />

      {/* Clouds */}
      {clouds.map((c) => (
        <motion.div
          key={c.id}
          className="absolute rounded-full"
          style={{
            left: `${c.left}%`, top: `${c.top}%`,
            width: c.size, height: c.size * 0.4,
            background: 'rgba(255,255,255,0.3)',
            filter: 'blur(10px)',
          }}
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Birds */}
      {birds.map((b) => (
        <motion.div
          key={b.id}
          className="absolute text-[10px] text-[#4a4a6a]"
          style={{ top: `${b.top}%` }}
          animate={{ x: ['-5vw', '105vw'], y: [0, -10, 0] }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'linear' }}
        >
          ~
        </motion.div>
      ))}
    </>
  )
}

/* ============================================
   Ancient Temple 🏛️
   ============================================ */
function AncientTempleBackground() {
  const runes = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 3,
      symbol: ['✦', '✧', '☀', '☽', '✵', '✶', '✷', '✹'][i],
    })), [])

  const dust = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 4,
    })), [])

  return (
    <>
      {/* Golden light */}
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[400px]"
        style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.2), transparent 70%)', filter: 'blur(30px)' }}
      />

      {/* Floating ruins */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[20%] top-[25%] w-24 h-16 rounded-lg border border-[#F59E0B]/30"
        style={{ background: 'linear-gradient(to bottom, rgba(245,158,11,0.1), rgba(217,119,6,0.05))' }}
      />
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute right-[25%] top-[30%] w-20 h-24 rounded-lg border border-[#F59E0B]/30"
        style={{ background: 'linear-gradient(to bottom, rgba(245,158,11,0.1), rgba(217,119,6,0.05))' }}
      />

      {/* Magic runes */}
      {runes.map((r) => (
        <motion.div
          key={r.id}
          className="absolute text-[#FBBF24]"
          style={{ left: `${r.left}%`, top: `${r.top}%`, textShadow: '0 0 10px rgba(251,191,36,0.5)' }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: r.duration, delay: r.delay, repeat: Infinity }}
        >
          {r.symbol}
        </motion.div>
      ))}

      {/* Dust particles */}
      {dust.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full bg-[#FBBF24]"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, opacity: 0.3 }}
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  )
}

/* ============================================
   Underwater 🌊
   ============================================ */
function UnderwaterBackground() {
  const fish = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      top: 20 + Math.random() * 60,
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 8,
      color: ['#0EA5E9', '#06B6D4', '#22D3EE', '#38BDF8', '#0EA5E9'][i],
    })), [])

  const bubbles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 6 + Math.random() * 6,
      delay: Math.random() * 4,
    })), [])

  const jellyfish = useMemo(() =>
    Array.from({ length: 2 }, (_, i) => ({
      id: i,
      left: 20 + Math.random() * 60,
      top: 20 + Math.random() * 40,
      duration: 10 + Math.random() * 5,
      delay: Math.random() * 5,
    })), [])

  return (
    <>
      {/* Light rays */}
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-[20%] w-[100px] h-[300px]"
        style={{ background: 'linear-gradient(to bottom, rgba(14,165,233,0.2), transparent)', transform: 'rotate(10deg)' }}
      />
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-0 right-[25%] w-[80px] h-[250px]"
        style={{ background: 'linear-gradient(to bottom, rgba(34,211,238,0.15), transparent)', transform: 'rotate(-15deg)' }}
      />

      {/* Fish */}
      {fish.map((f) => (
        <motion.div
          key={f.id}
          className="absolute text-sm"
          style={{ top: `${f.top}%`, color: f.color }}
          animate={{ x: ['-5vw', '105vw'], y: [0, -8, 0, 8, 0] }}
          transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'linear' }}
        >
          🐟
        </motion.div>
      ))}

      {/* Bubbles */}
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          className="absolute rounded-full border border-[#22D3EE]/30"
          style={{ left: `${b.left}%`, width: b.size, height: b.size }}
          animate={{ y: [0, -200], opacity: [0, 0.6, 0] }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Jellyfish */}
      {jellyfish.map((j) => (
        <motion.div
          key={j.id}
          className="absolute text-2xl"
          style={{ left: `${j.left}%`, top: `${j.top}%` }}
          animate={{ y: [0, -30, 0], x: [0, 10, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: j.duration, delay: j.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          🪼
        </motion.div>
      ))}

      {/* Coral reef */}
      <div className="absolute bottom-0 left-0 right-0 h-[20%] opacity-40"
        style={{ background: 'linear-gradient(to top, rgba(14,165,233,0.3), transparent)' }} />
    </>
  )
}

/* ============================================
   Cherry Blossom 🌸
   ============================================ */
function CherryBlossomBackground() {
  const petals = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 4 + Math.random() * 4,
      duration: 8 + Math.random() * 8,
      delay: Math.random() * 5,
      sway: Math.random() * 20,
    })), [])

  const lanterns = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      left: 20 + Math.random() * 60,
      top: 15 + Math.random() * 30,
      duration: 6 + Math.random() * 4,
      delay: Math.random() * 3,
    })), [])

  const butterflies = useMemo(() =>
    Array.from({ length: 2 }, (_, i) => ({
      id: i,
      top: 30 + Math.random() * 40,
      duration: 12 + Math.random() * 6,
      delay: Math.random() * 5,
    })), [])

  return (
    <>
      {/* Sunlight */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[400px]"
        style={{ background: 'radial-gradient(ellipse, rgba(255,200,150,0.3), transparent 70%)', filter: 'blur(30px)' }}
      />

      {/* Cherry blossom trees */}
      <div className="absolute bottom-0 left-[10%] w-40 h-40 rounded-t-full"
        style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.3), transparent 70%)' }} />
      <div className="absolute bottom-0 right-[15%] w-48 h-48 rounded-t-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.25), transparent 70%)' }} />

      {/* Falling petals */}
      {petals.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size, height: p.size,
            background: 'radial-gradient(circle, #F9A8D4, #F472B6)',
          }}
          animate={{ y: ['-5vh', '105vh'], x: [0, p.sway, -p.sway, 0], rotate: [0, 180, 360] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Lanterns */}
      {lanterns.map((l) => (
        <motion.div
          key={l.id}
          className="absolute text-xl"
          style={{ left: `${l.left}%`, top: `${l.top}%` }}
          animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: l.duration, delay: l.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          🏮
        </motion.div>
      ))}

      {/* Butterflies */}
      {butterflies.map((b) => (
        <motion.div
          key={b.id}
          className="absolute text-sm"
          style={{ top: `${b.top}%` }}
          animate={{ x: ['-5vw', '105vw'], y: [0, -15, 0, 15, 0] }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'linear' }}
        >
          🦋
        </motion.div>
      ))}
    </>
  )
}

/* ============================================
   Winter ❄️
   ============================================ */
function WinterBackground() {
  const snowflakes = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 8 + Math.random() * 8,
      delay: Math.random() * 5,
      sway: Math.random() * 15,
    })), [])

  return (
    <>
      {/* Aurora */}
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1], x: [0, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[10%] left-[10%] w-[400px] h-[200px] rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.2), rgba(147,197,253,0.15), transparent)', filter: 'blur(30px)' }}
      />

      {/* Frozen lake */}
      <div className="absolute bottom-0 left-0 right-0 h-[25%]"
        style={{ background: 'linear-gradient(to top, rgba(147,197,253,0.2), transparent)' }} />

      {/* Snowflakes */}
      {snowflakes.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, width: s.size, height: s.size, opacity: 0.7 }}
          animate={{ y: ['-5vh', '105vh'], x: [0, s.sway, -s.sway, 0] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Ice crystals */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute right-[20%] top-[30%] text-2xl"
      >
        ❄️
      </motion.div>
    </>
  )
}

/* ============================================
   Volcano 🌋
   ============================================ */
function VolcanoBackground() {
  const embers = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 3,
    })), [])

  const smoke = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: 30 + Math.random() * 40,
      size: 20 + Math.random() * 20,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 4,
    })), [])

  return (
    <>
      {/* Lava glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px]"
        style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.3), transparent 70%)', filter: 'blur(30px)' }}
      />

      {/* Volcano silhouette */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '150px solid transparent',
          borderRight: '150px solid transparent',
          borderBottom: '200px solid rgba(239,68,68,0.15)',
        }}
      />

      {/* Embers */}
      {embers.map((e) => (
        <motion.div
          key={e.id}
          className="absolute rounded-full"
          style={{
            left: `${e.left}%`,
            width: e.size, height: e.size,
            background: '#F97316',
            boxShadow: '0 0 8px rgba(249,115,22,0.5)',
          }}
          animate={{ y: [0, -100], opacity: [0, 1, 0], x: [0, Math.random() * 20 - 10] }}
          transition={{ duration: e.duration, delay: e.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Smoke */}
      {smoke.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`, bottom: '20%',
            width: s.size, height: s.size,
            background: 'rgba(100,100,100,0.2)',
            filter: 'blur(10px)',
          }}
          animate={{ y: [0, -100], opacity: [0, 0.4, 0], scale: [1, 2] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  )
}

/* ============================================
   Hacker Matrix 💻
   ============================================ */
function HackerMatrixBackground() {
  const codeRain = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 4,
      chars: Array.from({ length: 8 }, () => ['0', '1', '01', '10', '101', '010'][Math.floor(Math.random() * 6)]).join(' '),
    })), [])

  const glitches = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 0.2 + Math.random() * 0.3,
      delay: Math.random() * 10,
    })), [])

  return (
    <>
      {/* Circuit board floor */}
      <div className="absolute bottom-0 left-0 right-0 h-[20%] opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />

      {/* Code rain */}
      {codeRain.map((c) => (
        <motion.div
          key={c.id}
          className="absolute text-[10px] font-mono text-[#22C55E]"
          style={{ left: `${c.left}%`, textShadow: '0 0 5px rgba(34,197,94,0.5)' }}
          animate={{ y: ['-10vh', '110vh'], opacity: [0, 0.8, 0] }}
          transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: 'linear' }}
        >
          {c.chars}
        </motion.div>
      ))}

      {/* Digital glitches */}
      {glitches.map((g) => (
        <motion.div
          key={g.id}
          className="absolute w-20 h-1 bg-[#22C55E]"
          style={{ left: `${g.left}%`, top: `${g.top}%`, opacity: 0.3 }}
          animate={{ opacity: [0, 0.5, 0], x: [0, 10, -10, 0] }}
          transition={{ duration: g.duration, delay: g.delay, repeat: Infinity }}
        />
      ))}

      {/* Network lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        {[0, 1, 2, 3].map((i) => (
          <motion.line
            key={i}
            x1={`${10 + i * 25}%`} y1="0%"
            x2={`${20 + i * 25}%`} y2="100%"
            stroke="#22C55E" strokeWidth="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
          />
        ))}
      </svg>
    </>
  )
}

/* ============================================
   Fantasy Forest 🌲
   ============================================ */
function FantasyForestBackground() {
  const fireflies = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 2,
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 3,
    })), [])

  const leaves = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 3 + Math.random() * 3,
      duration: 10 + Math.random() * 6,
      delay: Math.random() * 5,
    })), [])

  return (
    <>
      {/* Glowing trees */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute bottom-0 left-[10%] w-32 h-48 rounded-t-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3), transparent 70%)', filter: 'blur(20px)' }}
      />
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, delay: 2 }}
        className="absolute bottom-0 right-[15%] w-40 h-56 rounded-t-full"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.25), transparent 70%)', filter: 'blur(20px)' }}
      />

      {/* Fog */}
      <motion.div
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[20%] left-0 right-0 h-[30%]"
        style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.05), transparent)', filter: 'blur(20px)' }}
      />

      {/* Fireflies */}
      {fireflies.map((f) => (
        <motion.div
          key={f.id}
          className="absolute rounded-full"
          style={{
            left: `${f.left}%`, top: `${f.top}%`,
            width: f.size, height: f.size,
            background: '#A7F3D0',
            boxShadow: '0 0 8px rgba(167,243,208,0.6)',
          }}
          animate={{ opacity: [0, 1, 0], y: [0, -15, 0], x: [0, 5, -5, 0] }}
          transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Floating leaves */}
      {leaves.map((l) => (
        <motion.div
          key={l.id}
          className="absolute rounded-full"
          style={{
            left: `${l.left}%`,
            width: l.size, height: l.size,
            background: 'radial-gradient(circle, #34D399, #10B981)',
          }}
          animate={{ y: ['-5vh', '105vh'], x: [0, 10, -10, 0], rotate: [0, 180, 360] }}
          transition={{ duration: l.duration, delay: l.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Magic mushrooms */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute bottom-[15%] left-[30%] text-lg"
      >
        🍄
      </motion.div>
    </>
  )
}

/* ============================================
   Space Station 🚀
   ============================================ */
function SpaceStationBackground() {
  const stars = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 0.5 + Math.random() * 1.5,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.5,
    })), [])

  const spacecraft = useMemo(() =>
    Array.from({ length: 2 }, (_, i) => ({
      id: i,
      top: 20 + Math.random() * 50,
      duration: 20 + Math.random() * 10,
      delay: Math.random() * 10,
    })), [])

  return (
    <>
      {/* Earth outside window */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute right-[10%] top-[15%] w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #3B82F6, #1D4ED8 50%, #1E3A5F)',
          boxShadow: '0 0 40px rgba(59,130,246,0.3)',
        }}
      />

      {/* Moon */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[15%] top-[20%] w-12 h-12 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #E5E7EB, #9CA3AF)',
          boxShadow: '0 0 20px rgba(229,231,235,0.2)',
        }}
      />

      {/* Stars */}
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.opacity }}
          animate={{ opacity: [s.opacity, s.opacity * 2, s.opacity] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Passing spacecraft */}
      {spacecraft.map((sc) => (
        <motion.div
          key={sc.id}
          className="absolute text-sm"
          style={{ top: `${sc.top}%` }}
          animate={{ x: ['-5vw', '105vw'] }}
          transition={{ duration: sc.duration, delay: sc.delay, repeat: Infinity, ease: 'linear' }}
        >
          🛸
        </motion.div>
      ))}

      {/* Station window frame */}
      <div className="absolute inset-0 border-[12px] border-[#1a1a2e]/80 rounded-3xl" />
    </>
  )
}

/* ============================================
   Dynamic Events Overlay
   ============================================ */
function DynamicEventOverlay({ type, intensity }: { type: string; intensity: number }) {
  const opacity = Math.min(0.8, intensity)

  switch (type) {
    case 'meteor-shower':
      return (
        <div className="absolute inset-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white"
              style={{ left: `${10 + i * 20}%`, top: '-5%', boxShadow: '0 0 10px rgba(255,255,255,0.8)' }}
              animate={{ y: ['0vh', '100vh'], x: [0, 50 + i * 20], opacity: [0, 1, 0] }}
              transition={{ duration: 2 + i * 0.3, delay: i * 0.2, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      )
    case 'northern-lights':
      return (
        <motion.div
          animate={{ opacity: [0, opacity, 0], x: [0, 50, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] left-0 right-0 h-[30%]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.3), rgba(147,197,253,0.2), rgba(167,139,250,0.3), transparent)',
            filter: 'blur(20px)',
          }}
        />
      )
    case 'fireworks':
      return (
        <div className="absolute inset-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${20 + i * 30}%`, top: `${20 + i * 15}%`,
                background: ['#EC4899', '#8B5CF6', '#22D3EE'][i],
                boxShadow: `0 0 20px ${['#EC4899', '#8B5CF6', '#22D3EE'][i]}`,
              }}
              animate={{ scale: [0, 3, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
        </div>
      )
    case 'lightning':
      return (
        <motion.div
          animate={{ opacity: [0, 1, 0, 0.5, 0] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 5 }}
          className="absolute inset-0"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        />
      )
    case 'rainbow':
      return (
        <motion.div
          animate={{ opacity: [0, opacity, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[15%] left-[10%] right-[10%] h-[20%] rounded-full"
          style={{
            background: 'linear-gradient(90deg, #EF4444, #F59E0B, #22C55E, #3B82F6, #8B5CF6)',
            filter: 'blur(20px)',
            opacity: 0.3,
          }}
        />
      )
    case 'passing-rocket':
      return (
        <motion.div
          className="absolute text-2xl"
          style={{ top: '30%' }}
          animate={{ x: ['-10vw', '110vw'], rotate: [0, 45, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          🚀
        </motion.div>
      )
    case 'satellite':
      return (
        <motion.div
          className="absolute text-lg"
          style={{ top: '25%' }}
          animate={{ x: ['-10vw', '110vw'], y: [0, -10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          🛰️
        </motion.div>
      )
    case 'flying-dragon':
      return (
        <motion.div
          className="absolute text-3xl"
          style={{ top: '20%' }}
          animate={{ x: ['-10vw', '110vw'], y: [0, -20, 0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        >
          🐉
        </motion.div>
      )
    case 'whale-jump':
      return (
        <motion.div
          className="absolute text-4xl"
          style={{ left: '50%', top: '60%' }}
          animate={{ y: [0, -80, 0], rotate: [0, 180, 360], opacity: [0, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          🐋
        </motion.div>
      )
    case 'bird-flock':
      return (
        <div className="absolute inset-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-xs"
              style={{ top: `${15 + i * 5}%` }}
              animate={{ x: ['-10vw', '110vw'], y: [0, -10, 0] }}
              transition={{ duration: 10 + i, delay: i * 0.3, repeat: Infinity, ease: 'linear' }}
            >
              🐦
            </motion.div>
          ))}
        </div>
      )
    case 'fireflies':
      return (
        <div className="absolute inset-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: `${10 + i * 10}%`, top: `${20 + i * 8}%`,
                background: '#A7F3D0',
                boxShadow: '0 0 10px rgba(167,243,208,0.8)',
              }}
              animate={{ opacity: [0, 1, 0], y: [0, -20, 0], x: [0, 10, -10, 0] }}
              transition={{ duration: 3 + i * 0.3, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      )
    default:
      return null
  }
}

export default ThemeBackground