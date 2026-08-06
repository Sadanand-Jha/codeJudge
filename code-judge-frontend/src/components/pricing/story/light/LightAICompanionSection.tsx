'use client'

import { useState } from 'react'
import { motion, MotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Bot, Bug, MessageSquare, Brain, Code2, X } from 'lucide-react'

interface Props {
  progress: MotionValue<number>
}

interface CompanionCard {
  id: string
  title: string
  desc: string
  icon: React.ElementType
  angle: number
  color: string
}

const CARDS: CompanionCard[] = [
  { id: 'coding', title: 'AI Coding', desc: 'Context-aware coding help while you solve problems.', icon: Code2, angle: -72, color: '#8B5CF6' },
  { id: 'debugging', title: 'AI Debugging', desc: 'Understand and fix errors faster with smart suggestions.', icon: Bug, angle: -36, color: '#EC4899' },
  { id: 'hints', title: 'AI Hints', desc: 'Progressive hints that guide without spoiling the solution.', icon: MessageSquare, angle: 0, color: '#6366F1' },
  { id: 'complexity', title: 'AI Complexity', desc: 'Know the time & space cost of your code instantly.', icon: Brain, angle: 36, color: '#C084FC' },
  { id: 'review', title: 'AI Review', desc: 'Full code review with performance suggestions.', icon: Bot, angle: 72, color: '#F472B6' },
]

/** Individual orbiting card — receives the unfold MotionValue and computes its own transforms. */
function OrbitCard({
  card,
  unfold,
  isSelected,
  onSelect,
}: {
  card: CompanionCard
  unfold: MotionValue<number>
  isSelected: boolean
  onSelect: (id: string | null) => void
}) {
  const Icon = card.icon
  const angleRad = (card.angle * Math.PI) / 180
  const orbitRadius = 150

  const x = useTransform(unfold, [0, 1], [0, Math.cos(angleRad) * orbitRadius])
  const y = useTransform(unfold, [0, 1], [0, Math.sin(angleRad) * orbitRadius])
  const cardOpacity = useTransform(unfold, [0, 0.6], [0, 1])
  const cardScale = useTransform(unfold, [0, 1], [0.3, 1])

  return (
    <motion.button
      style={{ x, y, opacity: cardOpacity, scale: cardScale }}
      whileHover={{ scale: 1.15, zIndex: 20 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(isSelected ? null : card.id)}
      className="absolute z-10 flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-2xl border border-[rgba(168,85,247,0.2)] bg-white/70 backdrop-blur-md shadow-[0_8px_32px_rgba(168,85,247,0.1)] transition-colors duration-300 hover:border-[rgba(168,85,247,0.4)] sm:h-32 sm:w-32"
      aria-label={card.title}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: `${card.color}1a`, color: card.color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-[11px] font-semibold text-[#3a3a5a]">{card.title}</span>
    </motion.button>
  )
}

/**
 * Section 2 — AI Companion (Light Theme)
 * A floating glass AI sphere with soft purple lighting and
 * translucent layers. Unfolds into 5 orbiting feature cards.
 */
export default function LightAICompanionSection({ progress }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  // Orb phase: 0 = compact orb, 1 = fully unfolded
  const unfold = useTransform(progress, [0.22, 0.38], [0, 1])
  const opacity = useTransform(progress, [0.2, 0.26, 0.46, 0.52], [0, 1, 1, 0])
  const y = useTransform(progress, [0.2, 0.52], [60, -60])
  const scale = useTransform(progress, [0.2, 0.52], [0.9, 1.05])

  const orbScale = useTransform(unfold, [0, 1], [1, 0.55])
  const orbOpacity = useTransform(unfold, [0, 0.7], [1, 0.35])
  const titleOpacity = useTransform(progress, [0.2, 0.26], [0, 1])
  const titleY = useTransform(progress, [0.2, 0.26], [30, 0])

  return (
    <motion.section
      style={{ opacity, y, scale }}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6"
      aria-label="AI Companion"
    >
      {/* Section title */}
      <motion.div
        style={{ opacity: titleOpacity, y: titleY }}
        className="absolute top-[12%] z-10 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-4xl md:text-5xl">
          Your <span className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">AI Companion</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#5a5a7a]">
          A floating intelligence that follows your coding journey.
        </p>
      </motion.div>

      {/* Orbiting cards */}
      <div className="relative flex h-[420px] w-[420px] items-center justify-center sm:h-[520px] sm:w-[520px]">
        {CARDS.map((card) => (
          <OrbitCard
            key={card.id}
            card={card}
            unfold={unfold}
            isSelected={selected === card.id}
            onSelect={setSelected}
          />
        ))}

        {/* Central glass AI sphere */}
        <motion.div
          style={{ scale: orbScale, opacity: orbOpacity }}
          className="relative z-0 flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48"
        >
          {/* Soft glow layers */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.25),transparent_70%)] blur-xl" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.15),transparent_70%)] blur-lg" />
          {/* Glass sphere core */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[rgba(168,85,247,0.3)] bg-gradient-to-br from-white/80 via-[#F3E8FF]/60 to-white/40 shadow-[0_0_40px_rgba(168,85,247,0.2)] backdrop-blur-xl sm:h-28 sm:w-28"
          >
            {/* Translucent layers */}
            <div className="absolute inset-0 rounded-full border border-[rgba(168,85,247,0.2)]" style={{ transform: 'rotate(45deg) scale(1.2)' }} />
            <div className="absolute inset-0 rounded-full border border-[rgba(236,72,153,0.15)]" style={{ transform: 'rotate(-30deg) scale(1.4)' }} />
            {/* Inner floating particles */}
            <motion.div
              animate={{ y: [0, -6, 0], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute left-[20%] top-[30%] h-1.5 w-1.5 rounded-full bg-[#8B5CF6]"
            />
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
              className="absolute right-[25%] bottom-[25%] h-1 w-1 rounded-full bg-[#EC4899]"
            />
            <motion.div
              animate={{ y: [0, -4, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
              className="absolute left-[40%] bottom-[20%] h-1 w-1 rounded-full bg-[#6366F1]"
            />
            <Bot className="h-10 w-10 text-[#7C3AED]" />
          </motion.div>
        </motion.div>
      </div>

      {/* Detail popover */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-[10%] z-30 w-full max-w-sm rounded-2xl border border-[rgba(168,85,247,0.2)] bg-white/90 p-5 shadow-[0_8px_40px_rgba(168,85,247,0.15)] backdrop-blur-xl"
          >
            {CARDS.filter((c) => c.id === selected).map((card) => {
              const Icon = card.icon
              return (
                <div key={card.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ background: `${card.color}1a`, color: card.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-[#1a1a2e]">{card.title}</h3>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="rounded-full p-1 text-[#8a8aa8] transition-colors hover:bg-[#F3E8FF] hover:text-[#7C3AED]"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-[#5a5a7a]">{card.desc}</p>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}