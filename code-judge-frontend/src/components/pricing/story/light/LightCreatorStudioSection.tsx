'use client'

import { motion, MotionValue, useTransform } from 'framer-motion'
import { Wand2, FileText, BarChart3, Users, Mail, Sparkles, CheckCircle2 } from 'lucide-react'

interface Props {
  progress: MotionValue<number>
}

/**
 * Section 3 — Creator Studio (Light Theme)
 * A bright futuristic AI workspace with floating glass windows,
 * question cards, charts, quiz analytics, students and AI generation.
 */
export default function LightCreatorStudioSection({ progress }: Props) {
  const opacity = useTransform(progress, [0.52, 0.58, 0.78, 0.84], [0, 1, 1, 0])
  const y = useTransform(progress, [0.52, 0.84], [80, -80])
  const scale = useTransform(progress, [0.52, 0.84], [0.92, 1.06])

  // Individual element parallax speeds
  const windowY = useTransform(progress, [0.52, 0.84], [40, -40])
  const chartY = useTransform(progress, [0.52, 0.84], [60, -60])
  const cardY = useTransform(progress, [0.52, 0.84], [80, -80])
  const studentsY = useTransform(progress, [0.52, 0.84], [30, -30])

  const titleOpacity = useTransform(progress, [0.52, 0.58], [0, 1])
  const titleY = useTransform(progress, [0.52, 0.58], [30, 0])

  return (
    <motion.section
      style={{ opacity, y, scale }}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6"
      aria-label="Creator Studio"
    >
      {/* Soft grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(139,92,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.2) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* Section title */}
      <motion.div
        style={{ opacity: titleOpacity, y: titleY }}
        className="absolute top-[10%] z-20 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-4xl md:text-5xl">
          The <span className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">Creator Studio</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#5a5a7a]">
          Step inside an AI-powered classroom where quizzes build themselves.
        </p>
      </motion.div>

      {/* Floating workspace windows */}
      <div className="relative h-[520px] w-full max-w-5xl">
        {/* Main AI generation window */}
        <motion.div
          style={{ y: windowY }}
          className="absolute left-1/2 top-1/2 z-10 w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[rgba(139,92,246,0.25)] bg-white/80 p-4 shadow-[0_8px_40px_rgba(139,92,246,0.15)] backdrop-blur-xl sm:w-[340px]"
        >
          <div className="flex items-center gap-2 border-b border-[rgba(139,92,246,0.15)] pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/15 text-[#7C3AED]">
              <Wand2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-[#1a1a2e]">AI Quiz Generator</div>
              <div className="text-[10px] text-[#8a8aa8]">Generating questions…</div>
            </div>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="ml-auto h-2 w-2 rounded-full bg-[#8B5CF6]"
            />
          </div>

          <div className="mt-3 space-y-2">
            {[
              { text: 'What is the time complexity of binary search?', done: true },
              { text: 'Explain the difference between var and let.', done: true },
              { text: 'Which data structure uses FIFO?', done: false },
            ].map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.4 }}
                className="flex items-start gap-2 rounded-lg bg-[#F3E8FF]/50 p-2.5"
              >
                {q.done ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#8B5CF6]/40"
                  />
                )}
                <span className="text-[11px] leading-relaxed text-[#4a4a6a]">{q.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Analytics chart window */}
        <motion.div
          style={{ y: chartY }}
          className="absolute left-[6%] top-[18%] z-10 hidden w-[220px] rounded-2xl border border-[rgba(236,72,153,0.2)] bg-white/70 p-4 shadow-[0_8px_32px_rgba(236,72,153,0.1)] backdrop-blur-xl sm:block"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#EC4899]" />
            <span className="text-[11px] font-bold text-[#1a1a2e]">Quiz Analytics</span>
          </div>
          <div className="mt-3 flex h-20 items-end gap-1.5">
            {[35, 55, 42, 70, 58, 85, 65].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                className="flex-1 rounded-t bg-gradient-to-t from-[#8B5CF6]/30 to-[#EC4899]/50"
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-[#8a8aa8]">
            <span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span>
          </div>
        </motion.div>

        {/* Question card */}
        <motion.div
          style={{ y: cardY }}
          className="absolute right-[6%] top-[22%] z-10 hidden w-[200px] rounded-2xl border border-[rgba(99,102,241,0.2)] bg-white/70 p-4 shadow-[0_8px_32px_rgba(99,102,241,0.1)] backdrop-blur-xl sm:block"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#6366F1]" />
            <span className="text-[11px] font-bold text-[#1a1a2e]">Question Bank</span>
          </div>
          <div className="mt-3 space-y-2">
            {['Arrays', 'Strings', 'DP', 'Graphs'].map((topic, i) => (
              <div key={topic} className="flex items-center justify-between">
                <span className="text-[10px] text-[#5a5a7a]">{topic}</span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F3E8FF]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${[80, 65, 45, 30][i]}%` }}
                    transition={{ delay: 0.6 + i * 0.15, duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Students window */}
        <motion.div
          style={{ y: studentsY }}
          className="absolute bottom-[8%] left-[12%] z-10 hidden w-[180px] rounded-2xl border border-[rgba(16,185,129,0.2)] bg-white/70 p-3 shadow-[0_8px_32px_rgba(16,185,129,0.1)] backdrop-blur-xl sm:block"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-[#1a1a2e]">Live Students</span>
          </div>
          <div className="mt-2 flex -space-x-2">
            {['#8B5CF6', '#EC4899', '#6366F1', '#F472B6', '#C084FC'].map((c, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                style={{ background: c }}
              >
                {['A', 'R', 'S', 'M', 'K'][i]}
              </motion.div>
            ))}
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#F3E8FF] text-[9px] font-bold text-[#7C3AED]">
              +42
            </div>
          </div>
        </motion.div>

        {/* Flying email hologram */}
        <motion.div
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: [0, 120, 200], y: [0, -60, -120] }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          className="absolute right-[18%] top-[55%] z-20 flex items-center gap-2 rounded-xl border border-[rgba(236,72,153,0.25)] bg-white/80 px-3 py-2 shadow-[0_4px_20px_rgba(236,72,153,0.15)] backdrop-blur-xl"
        >
          <Mail className="h-3.5 w-3.5 text-[#EC4899]" />
          <span className="text-[10px] font-medium text-[#4a4a6a]">Results sent!</span>
        </motion.div>

        {/* Sparkle accents */}
        <motion.div
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute left-[30%] top-[15%] text-[#C084FC]"
        >
          <Sparkles className="h-5 w-5" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          className="absolute right-[28%] bottom-[20%] text-[#F472B6]"
        >
          <Sparkles className="h-4 w-4" />
        </motion.div>
      </div>
    </motion.section>
  )
}