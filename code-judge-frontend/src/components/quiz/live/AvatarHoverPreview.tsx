'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Award, Flame, Trophy, Crown, Zap, Star } from 'lucide-react'
import type { LiveParticipant } from '@/types/liveAssessment'

interface AvatarHoverPreviewProps {
  participant: LiveParticipant | null
  onClose: () => void
}

export function AvatarHoverPreview({ participant, onClose }: AvatarHoverPreviewProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!participant) {
      setIsVisible(false)
      return
    }

    // Calculate position based on participant's current position
    const avatarEl = document.querySelector(`[data-participant-id="${participant.id}"]`)
    if (!avatarEl) return

    const rect = avatarEl.getBoundingClientRect()
    const cardWidth = 280
    const cardHeight = 320
    const padding = 20

    let x = rect.right + padding
    let y = rect.top

    // Prevent overflow on right edge
    if (x + cardWidth > window.innerWidth - padding) {
      x = rect.left - cardWidth - padding
    }

    // Prevent overflow on bottom edge
    if (y + cardHeight > window.innerHeight - padding) {
      y = window.innerHeight - cardHeight - padding
    }

    // Ensure minimum top position
    y = Math.max(padding, y)

    setPosition({ x, y })
    setIsVisible(true)
  }, [participant])

  if (!participant || !isVisible) return null

  const statusColor = {
    submitted: '#22C55E',
    attempting: '#3B82F6',
    idle: '#9CA3AF',
    disconnected: '#EF4444',
  }[participant.status]

  const statusLabel = {
    submitted: 'Submitted',
    attempting: 'Attempting',
    idle: 'Waiting',
    disconnected: 'Disconnected',
  }[participant.status]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed z-[500] pointer-events-auto"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '280px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop blur behind card */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'rgba(17, 24, 39, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.15)',
            }}
          />

          {/* Card content */}
          <div className="relative p-4">
            {/* Header with avatar and basic info */}
            <div className="flex items-start gap-3 mb-3">
              {/* Large avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-2"
                  style={{ borderColor: statusColor }}
                >
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${statusColor}20` }}
                    >
                      {participant.avatar}
                    </div>
                  )}
                </div>
                {/* Status indicator */}
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#111827]"
                  style={{ backgroundColor: statusColor }}
                />
              </div>

              {/* Name and basic info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{participant.username}</h3>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Roll #{participant.id.slice(-4)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                  <span className="text-[10px] font-medium" style={{ color: statusColor }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats pills */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Flame className="w-3 h-3 text-[#F59E0B]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[#71717A]">Streak</p>
                  <p className="text-[11px] font-bold text-white">12 days</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Trophy className="w-3 h-3 text-[#EC4899]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[#71717A]">Rating</p>
                  <p className="text-[11px] font-bold text-white">1,847</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Award className="w-3 h-3 text-[#8B5CF6]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[#71717A]">Solved</p>
                  <p className="text-[11px] font-bold text-white">342</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Users className="w-3 h-3 text-[#22C55E]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[#71717A]">Quizzes</p>
                  <p className="text-[11px] font-bold text-white">28</p>
                </div>
              </div>
            </div>

            {/* Premium badge (if applicable) */}
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-gradient-to-r from-[#A855F7]/10 to-[#EC4899]/10 border border-[#A855F7]/20">
              <Crown className="w-3.5 h-3.5 text-[#A855F7]" />
              <span className="text-[10px] font-bold text-[#A855F7]">Premium Member</span>
            </div>

            {/* Reaction buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:border-[#A855F7]/40 hover:bg-white/[0.08] transition-all duration-250"
              >
                <span className="text-sm">👋</span>
                <span className="text-[10px] font-medium text-[#9CA3AF]">Wave</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:border-[#A855F7]/40 hover:bg-white/[0.08] transition-all duration-250"
              >
                <span className="text-sm">👏</span>
                <span className="text-[10px] font-medium text-[#9CA3AF]">Clap</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:border-[#A855F7]/40 hover:bg-white/[0.08] transition-all duration-250"
              >
                <span className="text-sm">❤️</span>
                <span className="text-[10px] font-medium text-[#9CA3AF]">React</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AvatarHoverPreview