'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Award, Flame, Trophy, Crown } from 'lucide-react'
import type { LiveParticipant } from '@/types/liveAssessment'

interface AvatarHoverPreviewProps {
  participant: LiveParticipant | null
  /** Cancel the pending hide — called whenever the cursor enters the card. */
  onEnter: () => void
  /** Arm the delayed hide — called whenever the cursor leaves the card. */
  onLeave: () => void
}

const CARD_WIDTH = 280
const CARD_HEIGHT = 320
const PADDING = 16

export function AvatarHoverPreview({ participant, onEnter, onLeave }: AvatarHoverPreviewProps) {
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Avoid rendering a portal on the server / before hydration.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Re-anchor the card to the avatar's live bounding rect whenever the hovered
  // participant changes (the avatar stands still while hovered, so a single
  // calculation per participant is accurate and avoids re-render churn).
  useLayoutEffect(() => {
    if (!participant) return
    const avatarEl = document.querySelector(`[data-participant-id="${participant.id}"]`)
    if (!avatarEl) return

    const rect = avatarEl.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer placing the card to the right of the avatar; flip to the left when
    // there is not enough room on the right.
    let x = rect.right + PADDING
    if (x + CARD_WIDTH > vw - PADDING) {
      x = rect.left - CARD_WIDTH - PADDING
    }
    // Always clamp fully inside the viewport (also covers near-left-edge avatars).
    x = Math.max(PADDING, Math.min(x, vw - CARD_WIDTH - PADDING))

    let y = rect.top
    if (y + CARD_HEIGHT > vh - PADDING) {
      y = vh - CARD_HEIGHT - PADDING
    }
    y = Math.max(PADDING, y)

    setPosition({ x, y })
  }, [participant?.id, mounted])

  if (!mounted) return null

  const isOpen = !!participant

  const statusColor = participant
    ? {
        submitted: '#22C55E',
        attempting: '#3B82F6',
        idle: '#9CA3AF',
        disconnected: '#EF4444',
      }[participant.status]
    : '#9CA3AF'

  const statusLabel = participant
    ? {
        submitted: 'Submitted',
        attempting: 'Attempting',
        idle: 'Waiting',
        disconnected: 'Disconnected',
      }[participant.status]
    : ''

  return createPortal(
    <AnimatePresence>
      {isOpen && participant && (
        <motion.div
          key={participant.id}
          data-avatar-preview
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="qs-ui fixed z-[9999] pointer-events-auto"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${CARD_WIDTH}px`,
            background: "var(--qs-surface)",
            color: "var(--qs-ink)",
            border: "2px solid var(--qs-line)",
            borderRadius: "18px",
            boxShadow: "0 8px 0 rgba(26, 18, 64, 0.18)",
          }}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
          onClick={(e) => e.stopPropagation()}
        >
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
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
                  style={{ backgroundColor: statusColor, borderColor: "var(--qs-surface)" }}
                />
              </div>

              {/* Name and basic info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[var(--qs-ink)] truncate">{participant.username}</h3>
                <p className="text-[10px] text-[var(--qs-muted)] mt-0.5">Roll #{participant.id.slice(-4)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                  <span className="text-[10px] font-semibold" style={{ color: statusColor }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats pills */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--qs-bg)] border-2 border-[var(--qs-line)]">
                <Flame className="w-3 h-3 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[var(--qs-muted)]">Streak</p>
                  <p className="text-[11px] font-bold text-[var(--qs-ink)]">12 days</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--qs-bg)] border-2 border-[var(--qs-line)]">
                <Trophy className="w-3 h-3 text-[var(--qs-brand)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[var(--qs-muted)]">Rating</p>
                  <p className="text-[11px] font-bold text-[var(--qs-ink)]">1,847</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--qs-bg)] border-2 border-[var(--qs-line)]">
                <Award className="w-3 h-3 text-[var(--qs-brand)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[var(--qs-muted)]">Solved</p>
                  <p className="text-[11px] font-bold text-[var(--qs-ink)]">342</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--qs-bg)] border-2 border-[var(--qs-line)]">
                <Users className="w-3 h-3 text-[var(--qs-ok)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[var(--qs-muted)]">Quizzes</p>
                  <p className="text-[11px] font-bold text-[var(--qs-ink)]">28</p>
                </div>
              </div>
            </div>

            {/* Premium badge (if applicable) */}
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg border-2 border-[var(--qs-brand)] bg-[var(--qs-brand)]/10">
              <Crown className="w-3.5 h-3.5 text-[var(--qs-brand)]" />
              <span className="text-[10px] font-bold text-[var(--qs-brand)]">Premium Member</span>
            </div>

            {/* Reaction buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--qs-bg)] border-2 border-[var(--qs-line)] hover:border-[var(--qs-brand)] transition-all duration-250"
              >
                <span className="text-sm">👋</span>
                <span className="text-[10px] font-semibold text-[var(--qs-muted)]">Wave</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--qs-bg)] border-2 border-[var(--qs-line)] hover:border-[var(--qs-brand)] transition-all duration-250"
              >
                <span className="text-sm">👏</span>
                <span className="text-[10px] font-semibold text-[var(--qs-muted)]">Clap</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--qs-bg)] border-2 border-[var(--qs-line)] hover:border-[var(--qs-brand)] transition-all duration-250"
              >
                <span className="text-sm">❤️</span>
                <span className="text-[10px] font-semibold text-[var(--qs-muted)]">React</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default AvatarHoverPreview