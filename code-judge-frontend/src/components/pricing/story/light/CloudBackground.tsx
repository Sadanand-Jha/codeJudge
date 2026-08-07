'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useMotionValueEvent, MotionValue } from 'framer-motion'

interface Props {
  progress: MotionValue<number>
}

interface Bubble {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  hue: 'pink' | 'purple' | 'blue'
  floatSpeed: number
  floatPhase: number
  drift: number
}

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  drift: number
}

/**
 * CloudBackground — the light theme's premium animated background.
 * Floating glass bubbles, soft gradient blobs, light particles and
 * subtle light beams. Everything moves slowly with mouse parallax.
 * No stars, no dark space — just a bright, futuristic AI cloud.
 */
export default function CloudBackground({ progress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const smoothMouseX = useSpring(mouseX, { stiffness: 40, damping: 16 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 40, damping: 16 })

  const progressRef = useRef(0)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })

  useMotionValueEvent(progress, 'change', (v) => {
    progressRef.current = v
  })
  useMotionValueEvent(smoothMouseX, 'change', (v) => {
    mouseRef.current.x = v
  })
  useMotionValueEvent(smoothMouseY, 'change', (v) => {
    mouseRef.current.y = v
  })

  // Generate static bubble/particle positions once
  const bubbles = useRef<Bubble[]>([])
  const particles = useRef<Particle[]>([])

  useEffect(() => {
    const count = 8
    const b: Bubble[] = []
    for (let i = 0; i < count; i++) {
      b.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 80 + Math.random() * 180,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.15 + Math.random() * 0.25,
        hue: (['pink', 'purple', 'blue'] as const)[Math.floor(Math.random() * 3)],
        floatSpeed: 6 + Math.random() * 6,
        floatPhase: Math.random() * Math.PI * 2,
        drift: Math.random() * 2 - 1,
      })
    }
    bubbles.current = b

    const pCount = 24
    const p: Particle[] = []
    for (let i = 0; i < pCount; i++) {
      p.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 4,
        speed: 0.2 + Math.random() * 0.4,
        opacity: 0.2 + Math.random() * 0.4,
        drift: Math.random() * 2 - 1,
      })
    }
    particles.current = p
  }, [])

  const getBubbleColor = (hue: Bubble['hue']) => {
    switch (hue) {
      case 'pink': return 'rgba(236, 72, 153, 0.12)'
      case 'purple': return 'rgba(168, 85, 247, 0.15)'
      case 'blue': return 'rgba(59, 130, 246, 0.10)'
    }
  }

  const getBubbleBorder = (hue: Bubble['hue']) => {
    switch (hue) {
      case 'pink': return 'rgba(236, 72, 153, 0.2)'
      case 'purple': return 'rgba(168, 85, 247, 0.25)'
      case 'blue': return 'rgba(59, 130, 246, 0.18)'
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX / window.innerWidth)
    mouseY.set(e.clientY / window.innerHeight)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full overflow-hidden bg-[#FAFBFF]"
      aria-hidden="true"
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFFFFF] via-[#FCFCFD] to-[#FAFBFF]" />

      {/* Large soft gradient blobs — slow parallax */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -right-40 top-1/4 h-[600px] w-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.12), transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute bottom-[-200px] left-1/3 h-[550px] w-[550px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%)',
          filter: 'blur(65px)',
        }}
      />

      {/* Floating glass bubbles */}
      {bubbles.current.map((bubble, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20, 0],
            x: [0, bubble.drift * 15, 0],
          }}
          transition={{
            duration: bubble.floatSpeed,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: bubble.floatPhase,
          }}
          className="absolute rounded-full"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            width: bubble.size,
            height: bubble.size,
            background: getBubbleColor(bubble.hue),
            border: `1px solid ${getBubbleBorder(bubble.hue)}`,
            backdropFilter: 'blur(8px)',
            boxShadow: `inset 0 0 30px ${getBubbleColor(bubble.hue)}`,
          }}
        />
      ))}

      {/* Floating particles */}
      {particles.current.map((p, i) => (
        <motion.div
          key={`p-${i}`}
          animate={{
            y: [0, -30, 0],
            x: [0, p.drift * 20, 0],
            opacity: [p.opacity, p.opacity * 0.5, p.opacity],
          }}
          transition={{
            duration: 8 + p.speed * 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? 'rgba(168,85,247,0.4)' : i % 3 === 1 ? 'rgba(236,72,153,0.35)' : 'rgba(59,130,246,0.3)',
            boxShadow: `0 0 8px ${i % 3 === 0 ? 'rgba(168,85,247,0.3)' : i % 3 === 1 ? 'rgba(236,72,153,0.25)' : 'rgba(59,130,246,0.2)'}`,
          }}
        />
      ))}

      {/* Light beams */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], rotate: [0, 3, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[15%] top-[-20%] h-[140%] w-[80px]"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(168,85,247,0.08), transparent)',
          transform: 'rotate(15deg)',
        }}
      />
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2], rotate: [0, -2, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute right-[25%] top-[-20%] h-[140%] w-[60px]"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(236,72,153,0.07), transparent)',
          transform: 'rotate(-10deg)',
        }}
      />

      {/* Soft glowing rings */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[60%] top-[30%] h-[300px] w-[300px] rounded-full border border-[rgba(168,85,247,0.15)]"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute left-[55%] top-[25%] h-[400px] w-[400px] rounded-full border border-[rgba(236,72,153,0.12)]"
      />

      {/* Subtle mesh gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(168,85,247,0.05), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.04), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.03), transparent 60%)',
        }}
      />
    </div>
  )
}