'use client'

import { useRef } from 'react'
import { motion, useScroll, useSpring, useReducedMotion, useMotionValueEvent } from 'framer-motion'
import CloudBackground from './CloudBackground'
import LightArrivalSection from './LightArrivalSection'
import LightAICompanionSection from './LightAICompanionSection'
import LightCreatorStudioSection from './LightCreatorStudioSection'
import LightAICreditsSection from './LightAICreditsSection'
import LightWaitingRoomSection from './LightWaitingRoomSection'
import LightPricingCardsSection from './LightPricingCardsSection'

interface Props {
  onEnterBuilder: () => void
}

/**
 * LightScrollStory — the light theme's cinematic scroll experience.
 * A tall scroll container drives a single progress value (0 → 1.6)
 * that all sections and the cloud background react to.
 * Sections are stacked absolutely and cross-fade based on progress.
 */
export default function LightScrollStory({ onEnterBuilder }: Props) {
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
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest >= 0.3) {
      onEnterBuilder()
    }
  })

  // Safety net: if reduced motion is preferred, don't render the cinematic story.
  if (prefersReducedMotion) return null

  return (
    <div ref={containerRef} className="relative h-[600vh] w-full">
      {/* Fixed viewport that stays on screen while scrolling */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Cloud background */}
        <CloudBackground progress={progress} />

        {/* All sections stacked absolutely, cross-fading via progress */}
        <div className="relative h-full w-full">
          <LightArrivalSection progress={progress} />
          <LightAICompanionSection progress={progress} />
          <LightCreatorStudioSection progress={progress} />
          <LightAICreditsSection progress={progress} />
          <LightWaitingRoomSection progress={progress} />
          <LightPricingCardsSection progress={progress} onEnterBuilder={onEnterBuilder} />
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