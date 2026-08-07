'use client'

import { motion, MotionValue, useTransform } from 'framer-motion'
import { Sparkles, Flame, Crown, Star, Heart, Laugh, ThumbsUp, PartyPopper } from 'lucide-react'

interface Props {
  progress: MotionValue<number>
}

interface Avatar {
  id: string
  name: string
  initial: string
  color: string
  x: number
  y: number
  border: string
  decoration: 'crown' | 'flame' | 'star' | 'sparkles'
  reaction: 'heart' | 'laugh' | 'thumbsup' | 'party'
  floatSpeed: number
  floatDelay: number
}

const AVATARS: Avatar[] = [
  { id: 'a1', name: 'Aarav', initial: 'A', color: '#8B5CF6', x: 12, y: 30, border: '#EC4899', decoration: 'crown', reaction: 'heart', floatSpeed: 2.5, floatDelay: 0 },
  { id: 'a2', name: 'Riya', initial: 'R', color: '#EC4899', x: 28, y: 55, border: '#F472B6', decoration: 'flame', reaction: 'laugh', floatSpeed: 3, floatDelay: 0.4 },
  { id: 'a3', name: 'Sam', initial: 'S', color: '#6366F1', x: 45, y: 25, border: '#C084FC', decoration: 'star', reaction: 'thumbsup', floatSpeed: 2.8, floatDelay: 0.8 },
  { id: 'a4', name: 'Meera', initial: 'M', color: '#F472B6', x: 62, y: 60, border: '#8B5CF6', decoration: 'sparkles', reaction: 'party', floatSpeed: 3.2, floatDelay: 1.2 },
  { id: 'a5', name: 'Kabir', initial: 'K', color: '#C084FC', x: 78, y: 35, border: '#EC4899', decoration: 'crown', reaction: 'heart', floatSpeed: 2.6, floatDelay: 1.6 },
  { id: 'a6', name: 'Anaya', initial: 'N', color: '#F59E0B', x: 88, y: 65, border: '#F472B6', decoration: 'flame', reaction: 'laugh', floatSpeed: 3.4, floatDelay: 2 },
]

const DECORATION_ICONS = {
  crown: Crown,
  flame: Flame,
  star: Star,
  sparkles: Sparkles,
}

const REACTION_ICONS = {
  heart: Heart,
  laugh: Laugh,
  thumbsup: ThumbsUp,
  party: PartyPopper,
}

/**
 * Section 5 — Waiting Room Cosmetics
 * Playful scene with premium avatars walking, floating, talking,
 * using reactions, glowing borders and animated decorations.
 * Sells cosmetics visually.
 */
export default function WaitingRoomSection({ progress }: Props) {
  const opacity = useTransform(progress, [1.16, 1.22, 1.42, 1.48], [0, 1, 1, 0])
  const y = useTransform(progress, [1.16, 1.48], [80, -80])
  const scale = useTransform(progress, [1.16, 1.48], [0.92, 1.05])

  const titleOpacity = useTransform(progress, [1.16, 1.22], [0, 1])
  const titleY = useTransform(progress, [1.16, 1.22], [30, 0])

  return (
    <motion.section
      style={{ opacity, y, scale }}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6"
      aria-label="Waiting Room Cosmetics"
    >
      {/* Playful gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.08),transparent_60%)]" />

      {/* Section title */}
      <motion.div
        style={{ opacity: titleOpacity, y: titleY }}
        className="absolute top-[8%] z-20 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
          The <span className="bg-gradient-to-r from-[#F472B6] to-[#8B5CF6] bg-clip-text text-transparent">Waiting Room</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
          Where every entrance feels like an event.
        </p>
      </motion.div>

      {/* Avatars */}
      <div className="relative h-[480px] w-full max-w-5xl">
        {AVATARS.map((avatar) => {
          const DecorationIcon = DECORATION_ICONS[avatar.decoration]
          const ReactionIcon = REACTION_ICONS[avatar.reaction]

          return (
            <motion.div
              key={avatar.id}
              className="absolute z-10 flex flex-col items-center"
              style={{ left: `${avatar.x}%`, top: `${avatar.y}%` }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: avatar.floatSpeed, repeat: Infinity, delay: avatar.floatDelay, ease: 'easeInOut' }}
            >
              {/* Glowing border */}
              <div
                className="absolute -inset-1.5 rounded-full opacity-60 blur-md"
                style={{ background: `radial-gradient(circle, ${avatar.border}66, transparent 70%)` }}
              />

              {/* Avatar circle */}
              <div
                className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-bold text-white shadow-lg sm:h-16 sm:w-16"
                style={{
                  background: `linear-gradient(135deg, ${avatar.color}, ${avatar.color}99)`,
                  borderColor: avatar.border,
                  boxShadow: `0 0 20px ${avatar.border}44`,
                }}
              >
                {avatar.initial}

                {/* Decoration badge */}
                <div
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#0a0a1e]"
                  style={{ color: avatar.border }}
                >
                  <DecorationIcon className="h-3 w-3" />
                </div>

                {/* Reaction bubble */}
                <motion.div
                  animate={{ opacity: [0, 1, 1, 0], y: [-4, -14, -20], scale: [0.6, 1, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, delay: avatar.floatDelay + 1, times: [0, 0.2, 0.8, 1] }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2"
                  style={{ color: avatar.border }}
                >
                  <ReactionIcon className="h-4 w-4" />
                </motion.div>
              </div>

              {/* Name with gradient */}
              <div
                className="mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-sm"
                style={{
                  background: `${avatar.color}22`,
                  color: avatar.border,
                  border: `1px solid ${avatar.border}33`,
                }}
              >
                {avatar.name}
              </div>
            </motion.div>
          )
        })}

        {/* Join effect — new avatar entering */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, x: -80 }}
          animate={{ opacity: [0, 1, 1], scale: [0.3, 1.2, 1], x: [0, 0, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          className="absolute left-[50%] top-[45%] z-20 flex flex-col items-center"
        >
          <div className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.4),transparent_70%)] blur-md" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#EC4899] bg-gradient-to-br from-[#EC4899] to-[#8B5CF6] text-xl font-bold text-white shadow-[0_0_30px_rgba(236,72,153,0.5)]">
            Z
          </div>
          <div className="mt-2 rounded-full border border-[#EC4899]/40 bg-[#EC4899]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#F472B6] backdrop-blur-sm">
            Zoya joined!
          </div>
        </motion.div>

        {/* Floating sparkle particles */}
        {[
          { left: '20%', top: '20%', delay: 0 },
          { left: '70%', top: '15%', delay: 0.8 },
          { left: '35%', top: '75%', delay: 1.5 },
          { left: '85%', top: '50%', delay: 2.2 },
        ].map((p, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5], y: [-10, -30, -50] }}
            transition={{ duration: 3, repeat: Infinity, delay: p.delay }}
            className="pointer-events-none absolute text-[#F472B6]"
            style={{ left: p.left, top: p.top }}
          >
            <Sparkles className="h-3 w-3" />
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}