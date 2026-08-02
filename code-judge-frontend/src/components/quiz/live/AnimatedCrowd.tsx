"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveParticipant } from "@/types/liveAssessment";
import { StudentAvatar } from "./StudentAvatar";

interface AnimatedCrowdProps {
  participants: LiveParticipant[];
  className?: string;
}

const MIN_VISIBLE = 15;
const MAX_VISIBLE = 20;

interface RoamingState {
  // Current target position (percentages)
  targetX: number;
  targetY: number;
  // Movement settings
  duration: number;
  delay: number;
  // Breathing/bobbing settings
  breathDuration: number;
  breathDelay: number;
  rotateRange: number;
}

function randomPosition(): { x: number; y: number } {
  return {
    x: 5 + Math.random() * 90,
    y: 5 + Math.random() * 90,
  };
}

function createRoamingState(): RoamingState {
  const pos = randomPosition();
  return {
    targetX: pos.x,
    targetY: pos.y,
    duration: 45 + Math.random() * 6, // 8-14 seconds to reach destination (slow, calm)
    delay: Math.random() * 1.5,
    breathDuration: 40 + Math.random() * 3, // 4-7 seconds per breath (slower bobbing)
    breathDelay: Math.random() * 2,
    rotateRange: 0.5 + Math.random() * 1, // 0.5-1.5 degrees (subtler sway)
  };
}

// Memoized avatar - uses single motion.div for smooth position transitions
const MemoizedAvatar = React.memo<{
  participant: LiveParticipant;
  index: number;
  count: number;
  size: "xs" | "sm" | "md" | "lg";
  state: RoamingState;
}>(function AvatarItem({ participant, index, count, size, state }) {
  return (
    <motion.div
      className="absolute pointer-events-auto"
      style={{
        transform: "translate(-50%, -50%)",
        willChange: "transform, left, top",
      }}
      // Animate left/top directly - Framer Motion smoothly transitions when target changes
      animate={{
        left: `${state.targetX}%`,
        top: `${state.targetY}%`,
        opacity: 1,
        scale: 1,
      }}
      initial={{
        left: `${state.targetX}%`,
        top: `${state.targetY}%`,
        opacity: 0,
        scale: 0.7,
      }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{
        left: {
          duration: state.duration,
          delay: state.delay,
          ease: [0.4, 0, 0.2, 1], // Custom ease for natural walking feel
        },
        top: {
          duration: state.duration,
          delay: state.delay,
          ease: [0.4, 0, 0.2, 1],
        },
        opacity: { duration: 0.5 },
        scale: { duration: 0.5, ease: "easeOut" },
      }}
    >
      {/* Inner div for breathing/bobbing while moving (transform-based, GPU accelerated) */}
      <motion.div
        animate={{
          scale: [1, 1.03, 1],
          rotate: [0, state.rotateRange, -state.rotateRange, 0],
          y: [0, -2, 0, -1, 0], // Subtle bobbing while moving
        }}
        transition={{
          duration: state.breathDuration,
          delay: state.breathDelay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ willChange: "transform" }}
      >
        <StudentAvatar
          participant={participant}
          index={index}
          count={count}
          size={size}
          showName={false}
          showHoverCard
        />
      </motion.div>
    </motion.div>
  );
}, (prev, next) => {
  // Only re-render if participant, size, or target position changed
  return (
    prev.participant.id === next.participant.id &&
    prev.size === next.size &&
    prev.state.targetX === next.state.targetX &&
    prev.state.targetY === next.state.targetY
  );
});

export function AnimatedCrowd({ participants, className = "" }: AnimatedCrowdProps) {
  const [visibleParticipants, setVisibleParticipants] = useState<LiveParticipant[]>([]);
  const [roamingStates, setRoamingStates] = useState<Map<string, RoamingState>>(new Map());
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fullPool = useMemo(() => participants, [participants]);

  // Page Visibility API - pause when tab inactive
  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Initial spawn - no duplicates
  useEffect(() => {
    if (fullPool.length === 0) return;
    if (visibleParticipants.length > 0) return;

    const targetCount = Math.min(
      MAX_VISIBLE,
      Math.max(MIN_VISIBLE, Math.floor(fullPool.length * 0.5))
    );

    const shuffled = [...fullPool].sort(() => Math.random() - 0.5);
    const seen = new Set<string>();
    const initial: LiveParticipant[] = [];
    for (const p of shuffled) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      initial.push(p);
      if (initial.length >= targetCount) break;
    }

    const timers: NodeJS.Timeout[] = [];
    initial.forEach((participant, index) => {
      const timer = setTimeout(() => {
        setVisibleParticipants((prev) => [...prev, participant]);
        setRoamingStates((prev) => {
          const next = new Map(prev);
          next.set(participant.id, createRoamingState());
          return next;
        });

        if ((window as any).__waitingRoomToast) {
          (window as any).__waitingRoomToast(participant);
        }
      }, 500 + index * 400);

      timers.push(timer);
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullPool]);

  // Roaming: move 1-2 random avatars to new destinations every 10 seconds
  // Each avatar smoothly travels to its new position (no teleporting)
  useEffect(() => {
    if (visibleParticipants.length === 0 || !isVisible) return;

    const roamingTimer = setInterval(() => {
      if (document.hidden) return;

      // Determine how many avatars to move (1-2, calmer crowd)
      const seconds = Math.floor(Date.now() / 1000);
      const moveCount = Math.min(
        Math.max(1, seconds % 3),
        visibleParticipants.length
      );

      // Pick random avatars to move
      const indicesToMove = new Set<number>();
      while (indicesToMove.size < moveCount && indicesToMove.size < visibleParticipants.length) {
        indicesToMove.add(Math.floor(Math.random() * visibleParticipants.length));
      }

      // Update only the selected avatars with new destinations
      setRoamingStates((prev) => {
        const next = new Map(prev);
        indicesToMove.forEach((idx) => {
          const p = visibleParticipants[idx];
          if (!next.has(p.id)) return;
          // Give them a new random destination with new speed/duration
          next.set(p.id, createRoamingState());
        });
        return next;
      });
    }, 10000);

    return () => clearInterval(roamingTimer);
  }, [visibleParticipants, isVisible]);

  // Continuous replacement: every 10 seconds replace 1 avatar (no duplicates)
  useEffect(() => {
    if (visibleParticipants.length < 3 || !isVisible) return;

    const replacementTimer = setInterval(() => {
      if (document.hidden) return;

      setVisibleParticipants((prev) => {
        if (prev.length < 3) return prev;

        const removeCount = 1; // gentler turnover
        const removeIndices = new Set<number>();
        while (removeIndices.size < removeCount && removeIndices.size < prev.length) {
          removeIndices.add(Math.floor(Math.random() * prev.length));
        }

        const remaining = prev.filter((_, i) => !removeIndices.has(i));
        const remainingIds = new Set(remaining.map((r) => r.id));

        // Clean up roaming states for removed avatars
        removeIndices.forEach((idx) => {
          const removed = prev[idx];
          if (removed) {
            setRoamingStates((prevStates) => {
              const next = new Map(prevStates);
              next.delete(removed.id);
              return next;
            });
          }
        });

        // Find available participants not currently visible (no duplicates)
        const available = fullPool.filter((p) => !remainingIds.has(p.id));
        if (available.length === 0) return prev;

        const addCount = Math.min(removeCount, available.length);
        const newOnes: LiveParticipant[] = [];
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const newIds = new Set<string>();

        for (let i = 0; i < addCount && i < shuffled.length; i++) {
          if (newIds.has(shuffled[i].id)) continue;
          newIds.add(shuffled[i].id);
          newOnes.push(shuffled[i]);

          // Initialize roaming state for new avatar
          setRoamingStates((prevStates) => {
            const next = new Map(prevStates);
            next.set(shuffled[i].id, createRoamingState());
            return next;
          });

          if ((window as any).__waitingRoomToast) {
            (window as any).__waitingRoomToast(shuffled[i]);
          }
        }

        return [...remaining, ...newOnes];
      });
    }, 10000);

    return () => clearInterval(replacementTimer);
  }, [fullPool, visibleParticipants.length, isVisible]);

  const count = visibleParticipants.length;

  return (
    <div className={`relative w-full h-full pointer-events-none ${className}`}>
      <div className="relative w-full h-full" ref={containerRef}>
        <AnimatePresence>
          {visibleParticipants.map((p, i) => {
            const state = roamingStates.get(p.id);
            if (!state) return null;

            const sizeVariant = (i % 4) as 0 | 1 | 2 | 3;
            const size = ["xs", "sm", "md", "lg"][sizeVariant] as "xs" | "sm" | "md" | "lg";

            return (
              <MemoizedAvatar
                key={p.id}
                participant={p}
                index={i}
                count={count}
                size={size}
                state={state}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AnimatedCrowd;