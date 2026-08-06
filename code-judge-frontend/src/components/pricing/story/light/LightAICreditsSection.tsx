'use client'

import { motion, MotionValue, useTransform } from 'framer-motion'
import { Crown, Zap, Coins, ShoppingCart, Cpu, FileText } from 'lucide-react'

interface Props {
  progress: MotionValue<number>
}

interface FlowNode {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
}

const FLOW_NODES: FlowNode[] = [
  { id: 'subscription', title: 'Subscription', subtitle: 'Unlocks AI', icon: Crown, color: '#8B5CF6' },
  { id: 'monthly', title: 'Monthly Credits', subtitle: 'Included every month', icon: Coins, color: '#EC4899' },
  { id: 'purchased', title: 'Purchased Credits', subtitle: 'Buy more anytime', icon: ShoppingCart, color: '#F472B6' },
  { id: 'processing', title: 'AI Processing', subtitle: 'Credits consumed', icon: Cpu, color: '#6366F1' },
  { id: 'quiz', title: 'Generated Quiz', subtitle: 'Your result', icon: FileText, color: '#C084FC' },
]

/**
 * Section 4 — AI Credits (Light Theme)
 * Glass credit tokens connected by glowing paths with animated flowing dots.
 * Shows: Subscription → Monthly Credits → Purchased Credits → AI Processing → Generated Quiz
 */
export default function LightAICreditsSection({ progress }: Props) {
  const opacity = useTransform(progress, [0.84, 0.9, 1.1, 1.16], [0, 1, 1, 0])
  const y = useTransform(progress, [0.84, 1.16], [80, -80])
  const scale = useTransform(progress, [0.84, 1.16], [0.92, 1.05])

  const titleOpacity = useTransform(progress, [0.84, 0.9], [0, 1])
  const titleY = useTransform(progress, [0.84, 0.9], [30, 0])

  return (
    <motion.section
      style={{ opacity, y, scale }}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6"
      aria-label="AI Credits"
    >
      {/* Glowing path background */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-15" aria-hidden="true">
        <defs>
          <linearGradient id="light-credit-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.line
            key={i}
            x1={`${5 + i * 20}%`}
            y1="0%"
            x2={`${15 + i * 20}%`}
            y2="100%"
            stroke="url(#light-credit-line-grad)"
            strokeWidth="0.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatType: 'reverse' }}
          />
        ))}
      </svg>

      {/* Section title */}
      <motion.div
        style={{ opacity: titleOpacity, y: titleY }}
        className="absolute top-[8%] z-20 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-4xl md:text-5xl">
          AI <span className="bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] bg-clip-text text-transparent">Credits</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#5a5a7a]">
          Subscription = Access. Credits = Fuel.
        </p>
      </motion.div>

      {/* Energy flow chain */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-3">
        {FLOW_NODES.map((node, i) => {
          const Icon = node.icon
          const isFirst = i === 0
          const isLast = i === FLOW_NODES.length - 1

          return (
            <div key={node.id} className="flex w-full flex-col items-center">
              {/* Node */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`flex w-full max-w-sm items-center gap-4 rounded-2xl border p-4 backdrop-blur-xl transition-colors duration-300 ${
                  isFirst
                    ? 'border-[rgba(139,92,246,0.3)] bg-white/80 shadow-[0_8px_32px_rgba(139,92,246,0.15)]'
                    : isLast
                      ? 'border-[rgba(192,132,252,0.3)] bg-white/80 shadow-[0_8px_32px_rgba(192,132,252,0.15)]'
                      : 'border-[rgba(168,85,247,0.15)] bg-white/60 hover:border-[rgba(168,85,247,0.3)]'
                }`}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${node.color}1a`, color: node.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-[#1a1a2e]">{node.title}</div>
                  <div className="text-[11px] text-[#8a8aa8]">{node.subtitle}</div>
                </div>
                {!isLast && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    className="text-[#8B5CF6]"
                  >
                    <Zap className="h-4 w-4" />
                  </motion.div>
                )}
              </motion.div>

              {/* Connector with flowing energy */}
              {!isLast && (
                <div className="relative h-8 w-px overflow-hidden">
                  <motion.div
                    animate={{ y: [-16, 16] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
                    className="absolute left-1/2 h-4 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#EC4899]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/20 to-[#EC4899]/20" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Floating glass credit tokens */}
      {[
        { left: '15%', top: '30%', color: '#8B5CF6', size: 6 },
        { left: '85%', top: '35%', color: '#EC4899', size: 5 },
        { left: '20%', top: '70%', color: '#6366F1', size: 4 },
        { left: '80%', top: '65%', color: '#F472B6', size: 7 },
      ].map((p, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          className="pointer-events-none absolute z-0 rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 12px ${p.color}66`,
          }}
        />
      ))}
    </motion.section>
  )
}