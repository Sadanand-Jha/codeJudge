'use client'

import { useRef } from 'react'
import { motion, useScroll, useSpring, useReducedMotion, useMotionValueEvent } from 'framer-motion'
import CosmicBackground from './CosmicBackground'
import ArrivalSection from './ArrivalSection'
import AICompanionSection from './AICompanionSection'
import CreatorStudioSection from './CreatorStudioSection'
import AICreditsSection from './AICreditsSection'
import WaitingRoomSection from './WaitingRoomSection'
import PricingCardsSection from './PricingCardsSection'

interface Props {
  onEnterBuilder: () => void
}

/**
 * ScrollStory — the cinematic scroll experience.
 * A tall scroll container drives a single progress value (0 → 1.6)
 * that all sections and the cosmic background react to.
 * Sections are stacked absolutely and cross-fade based on progress.
 */
export default function ScrollStory({ onEnterBuilder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Smooth the scroll progress for cinematic feel
  const progress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 20,
    mass: 0.5,
  })

  // After 30% scroll, redirect the user to the builder.
  // The "Skip to Builder" button has been removed — scrolling 30% is now the way in.
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest >= 0.3) {
      onEnterBuilder()
    }
  })

  // Safety net: if reduced motion is preferred, don't render the cinematic story.
  // The parent page also checks this and renders the builder directly.
  if (prefersReducedMotion) return null

  return (
    <div ref={containerRef} className="relative h-[600vh] w-full">
      {/* Fixed viewport that stays on screen while scrolling */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Cosmic background */}
        <CosmicBackground progress={progress} />

        {/* All sections stacked absolutely, cross-fading via progress */}
        <div className="relative h-full w-full">
          <ArrivalSection progress={progress} />
          <AICompanionSection progress={progress} />
          <CreatorStudioSection progress={progress} />
          <AICreditsSection progress={progress} />
          <WaitingRoomSection progress={progress} />
          <PricingCardsSection progress={progress} onEnterBuilder={onEnterBuilder} />
        </div>

        {/* Scroll progress indicator */}
        <motion.div
          style={{ scaleX: progress }}
          className="fixed bottom-0 left-0 right-0 z-50 h-0.5 origin-left bg-gradient-to-r from-[#EC4899] via-[#8B5CF6] to-[#6366F1]"
        />
      </div>
    </div>
  )
}