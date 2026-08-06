'use client'

import { useState } from 'react'
import { motion, MotionValue, useTransform } from 'framer-motion'
import { Crown, GraduationCap, Users, Check, Sparkles } from 'lucide-react'

interface Props {
  progress: MotionValue<number>
  onEnterBuilder: () => void
}

interface Plan {
  id: string
  name: string
  price: string
  tagline: string
  icon: React.ElementType
  gradient: string
  glow: string
  features: string[]
  audience: 'student' | 'creator' | 'both'
}

const PLANS: Plan[] = [
  {
    id: 'student',
    name: 'Student Pro',
    price: '₹299',
    tagline: 'AI-powered learning',
    icon: GraduationCap,
    gradient: 'from-[#EC4899] to-[#8B5CF6]',
    glow: 'rgba(236,72,153,0.3)',
    audience: 'student',
    features: ['AI Coding Companion', 'AI Hints', 'AI Debugger', '300 credits/month', 'Premium avatars'],
  },
  {
    id: 'creator',
    name: 'Creator Pro',
    price: '₹599',
    tagline: 'Build & scale quizzes',
    icon: Users,
    gradient: 'from-[#6366F1] to-[#8B5CF6]',
    glow: 'rgba(99,102,241,0.3)',
    audience: 'creator',
    features: ['AI Quiz Generation', 'AI Test Cases', 'AI Question Improver', '800 credits/month', 'Email & PDF reports'],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: '₹899',
    tagline: 'Everything unlocked',
    icon: Crown,
    gradient: 'from-[#EC4899] via-[#8B5CF6] to-[#6366F1]',
    glow: 'rgba(139,92,246,0.4)',
    audience: 'both',
    features: ['All AI features', 'All creator tools', 'All cosmetics', '1800 credits/month', 'Everything included'],
  },
]

/**
 * Section 6 — Pricing Cards
 * Calm finale. Glass cards rise from below, float gently,
 * and rotate slightly with mouse position.
 * Hovering a plan highlights its relevant features.
 */
export default function PricingCardsSection({ progress, onEnterBuilder }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const opacity = useTransform(progress, [1.48, 1.54], [0, 1])
  const y = useTransform(progress, [1.48, 1.54], [80, 0])
  const titleOpacity = useTransform(progress, [1.48, 1.54], [0, 1])
  const titleY = useTransform(progress, [1.48, 1.54], [30, 0])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    })
  }

  return (
    <motion.section
      style={{ opacity, y }}
      onMouseMove={handleMouseMove}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6"
      aria-label="Pricing Plans"
    >
      {/* Calm ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1),transparent_60%)]" />

      {/* Section title */}
      <motion.div
        style={{ opacity: titleOpacity, y: titleY }}
        className="relative z-20 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
          Choose Your <span className="bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] bg-clip-text text-transparent">Path</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
          Hover a plan to see what lights up.
        </p>
      </motion.div>

      {/* Pricing cards */}
      <div className="relative z-10 mt-12 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon
          const isHovered = hovered === plan.id
          const isUltimate = plan.id === 'ultimate'

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHovered(plan.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                rotateX: mousePos.y * 6,
                rotateY: mousePos.x * 6,
                transformPerspective: 800,
              }}
              className={`group relative rounded-3xl border p-6 backdrop-blur-xl transition-all duration-500 ${
                isUltimate
                  ? 'border-[#8B5CF6]/40 bg-gradient-to-b from-[#8B5CF6]/15 to-[#EC4899]/10 shadow-[0_0_40px_rgba(139,92,246,0.2)]'
                  : 'border-white/10 bg-white/5 hover:border-white/25'
              } ${isHovered ? 'scale-105' : 'scale-100'}`}
            >
              {/* Floating animation */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                className="flex h-full flex-col"
              >
                {/* Plan icon */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.gradient} text-white shadow-lg`}
                  style={{ boxShadow: `0 0 24px ${plan.glow}` }}
                >
                  <Icon className="h-6 w-6" />
                </div>

                {/* Plan name & price */}
                <h3 className="mt-4 text-lg font-extrabold text-white">{plan.name}</h3>
                <p className="text-[11px] text-white/50">{plan.tagline}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-[11px] text-white/40">/month</span>
                </div>

                {/* Features */}
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feature, fi) => (
                    <motion.li
                      key={feature}
                      animate={{
                        opacity: isHovered ? 1 : 0.5,
                        x: isHovered ? 4 : 0,
                      }}
                      transition={{ delay: fi * 0.05, duration: 0.3 }}
                      className="flex items-center gap-2 text-[12px] text-white/70"
                    >
                      <Check
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isHovered ? '#EC4899' : '#8B5CF6' }}
                      />
                      {feature}
                    </motion.li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={onEnterBuilder}
                  className={`mt-6 w-full rounded-xl bg-gradient-to-r ${plan.gradient} px-4 py-2.5 text-[12px] font-bold text-white transition-all duration-300 hover:shadow-lg`}
                  style={{ boxShadow: isHovered ? `0 4px 20px ${plan.glow}` : 'none' }}
                >
                  {isUltimate ? 'Go Ultimate' : `Choose ${plan.name}`}
                </button>
              </motion.div>

              {/* Ultimate badge */}
              {isUltimate && (
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-3 py-1 text-[9px] font-bold tracking-wider text-white shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  RECOMMENDED
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Enter builder hint */}
      <motion.button
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        onClick={onEnterBuilder}
        className="relative z-10 mt-10 text-[12px] font-medium text-white/40 transition-colors hover:text-white/70"
      >
        Build your own custom plan →
      </motion.button>
    </motion.section>
  )
}