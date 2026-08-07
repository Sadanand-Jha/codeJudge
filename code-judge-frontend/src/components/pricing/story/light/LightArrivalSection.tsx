'use client'

import { motion, MotionValue, useTransform } from 'framer-motion'
import { Sparkles, ArrowDown } from 'lucide-react'

interface Props {
  progress: MotionValue<number>
}

/**
 * Section 1 — Arrival (Light Theme)
 * Soft daylight atmosphere with floating glass elements.
 * The heading appears illuminated by soft daylight.
 */
export default function LightArrivalSection({ progress }: Props) {
  const opacity = useTransform(progress, [0, 0.12, 0.22], [1, 1, 0])
  const y = useTransform(progress, [0, 0.22], [0, -80])
  const scale = useTransform(progress, [0, 0.22], [1, 1.15])
  const blur = useTransform(progress, [0, 0.22], ['blur(0px)', 'blur(8px)'])

  return (
    <motion.section
      style={{ opacity, y, scale, filter: blur }}
      className="relative flex h-screen w-full flex-col items-center justify-center px-6 text-center"
      aria-label="Upgrade Your AI Workspace"
    >
      {/* Soft daylight glow behind title */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.10),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.08),transparent_65%)] blur-2xl" />

      {/* Floating glass elements */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-[15%] top-[25%] h-16 w-16 rounded-2xl border border-[rgba(168,85,247,0.2)] bg-white/40 backdrop-blur-md"
        style={{ boxShadow: '0 8px 32px rgba(168,85,247,0.1)' }}
      />
      <motion.div
        animate={{ y: [0, -18, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="pointer-events-none absolute right-[18%] top-[30%] h-20 w-20 rounded-full border border-[rgba(236,72,153,0.2)] bg-white/30 backdrop-blur-md"
        style={{ boxShadow: '0 8px 32px rgba(236,72,153,0.1)' }}
      />
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="pointer-events-none absolute left-[25%] bottom-[30%] h-12 w-12 rounded-xl border border-[rgba(59,130,246,0.2)] bg-white/40 backdrop-blur-md"
        style={{ boxShadow: '0 8px 32px rgba(59,130,246,0.1)' }}
      />
      <motion.div
        animate={{ y: [0, -14, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="pointer-events-none absolute right-[28%] bottom-[25%] h-14 w-14 rounded-full border border-[rgba(168,85,247,0.15)] bg-white/30 backdrop-blur-md"
        style={{ boxShadow: '0 8px 32px rgba(168,85,247,0.08)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/20 bg-white/60 px-4 py-1.5 text-[11px] font-medium tracking-wide text-[#7C3AED] backdrop-blur-sm shadow-[0_2px_12px_rgba(168,85,247,0.1)]">
          <Sparkles className="h-3.5 w-3.5" />
          CodeJudge Premium
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-[#1a1a2e] sm:text-6xl md:text-7xl"
      >
        Upgrade Your{' '}
        <span className="bg-gradient-to-r from-[#EC4899] via-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent">
          AI Workspace
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#4a4a6a] sm:text-lg"
      >
        Explore the premium capabilities of the CodeJudge ecosystem — AI companions,
        creator studios, and a cloud of possibilities.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-10"
      >
        <button className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_32px_rgba(168,85,247,0.3)] transition-all duration-300 hover:shadow-[0_12px_48px_rgba(139,92,246,0.4)]">
          <span className="relative z-10">Explore the Cloud</span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 text-[#8a8aa8]"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Scroll to begin</span>
          <ArrowDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </motion.section>
  )
}