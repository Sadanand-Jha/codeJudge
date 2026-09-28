"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveParticipant } from "@/types/liveAssessment";
import { StudentAvatar } from "./StudentAvatar";
import { PREDEFINED_AVATARS, DEFAULT_AVATAR_URL } from "@/config/dicebear";
import { preloadImages } from "@/hooks/useImagePreload";
import { useIsMobile } from "@/hooks/useIsMobile";

interface AnimatedCrowdProps {
  participants: LiveParticipant[];
  className?: string;
  /** Open/keep-open the preview for a participant. */
  onShow?: (participant: LiveParticipant) => void;
  /** Arm the delayed hide (called when the cursor leaves all avatars). */
  onArmHide?: () => void;
  /** Force an immediate hide (e.g. window blur). */
  onHideNow?: () => void;
  /** Render a big soft glow halo behind every avatar (decorative backgrounds). */
  glow?: boolean;
  /** Multiplier for roaming and idle animation speed. */
  speedMultiplier?: number;
}

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

function createRoamingState(speedMultiplier = 1): RoamingState {
  const speed = Math.max(0.25, speedMultiplier);
  const pos = randomPosition();
  return {
    targetX: pos.x,
    targetY: pos.y,
    duration: (25 + Math.random()) / speed,
    delay: (Math.random() * 1.5) / speed,
    breathDuration: (12 + Math.random() * 3) / speed,
    breathDelay: (Math.random() * 12) / speed,
    rotateRange: 0.5 + Math.random(),
  };
}

// Big soft halo colors, cycled per avatar (decorative background glow).
const GLOW_PALETTE: Array<[string, string]> = [
  ["rgba(139,124,255,0.55)", "rgba(236,72,153,0.35)"],
  ["rgba(236,72,153,0.55)", "rgba(139,124,255,0.35)"],
  ["rgba(79,157,255,0.55)", "rgba(139,124,255,0.35)"],
  ["rgba(34,211,238,0.50)", "rgba(79,157,255,0.35)"],
  ["rgba(245,158,11,0.45)", "rgba(236,72,153,0.30)"],
];

// Memoized avatar - uses single motion.div for smooth position transitions
const MemoizedAvatar = React.memo<{
  participant: LiveParticipant;
  index: number;
  count: number;
  size: "xs" | "sm" | "md" | "lg";
  state: RoamingState;
  isHovered: boolean;
  glow: boolean;
}>(function AvatarItem({ participant, index, count, size, state, isHovered, glow }) {
  const [glowC1, glowC2] = GLOW_PALETTE[index % GLOW_PALETTE.length];
  return (
    <motion.div
      className="absolute pointer-events-auto"
      style={{
        transform: "translate(-50%, -50%)",
        willChange: "transform, left, top",
      }}
      data-participant-id={participant.id}
      // Animate left/top directly - Framer Motion smoothly transitions when target changes
      animate={{
        left: `${state.targetX}%`,
        top: `${state.targetY}%`,
        opacity: 1,
        scale: isHovered ? 1.12 : 1,
        zIndex: isHovered ? 100 : 1,
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
          type: "tween",
          duration: isHovered ? 0 : state.duration,
          delay: isHovered ? 0 : state.delay,
          ease: [0.45, 0, 0.55, 1],
        },
        top: {
          type: "tween",
          duration: isHovered ? 0 : state.duration,
          delay: isHovered ? 0 : state.delay,
          ease: [0.45, 0, 0.55, 1],
        },
        opacity: { duration: 0.5 },
        scale: { duration: 0.2, ease: "easeOut" },
        zIndex: { duration: 0 },
      }}
    >
      {/* Big ambient halo — sits behind the avatar, gently breathing */}
      {glow && (
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 rounded-full"
          style={{
            width: "220%",
            height: "220%",
            x: "-50%",
            y: "-50%",
            background: `radial-gradient(circle, ${glowC1} 0%, ${glowC2} 45%, transparent 70%)`,
            filter: "blur(18px)",
          }}
          animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.12, 1] }}
          transition={{ duration: 4 + (index % 5), repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* Inner div for breathing/bobbing while moving (transform-based, GPU accelerated) */}
      <motion.div
        animate={{
          scale: isHovered ? [1, 1.05, 1] : [1, 1.03, 1],
          rotate: isHovered ? [0, 3, -3, 0] : [0, state.rotateRange, -state.rotateRange, 0],
          y: isHovered ? [0, -3, 0] : [0, -2, 0, -1, 0],
        }}
        transition={{
          duration: isHovered ? 1.5 : state.breathDuration,
          delay: isHovered ? 0 : state.breathDelay,
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
          showHoverCard={false}
        />
      </motion.div>

      {/* Hover glow effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(236, 72, 153, 0.3)',
              '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(236, 72, 153, 0.5)',
              '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(236, 72, 153, 0.3)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            left: '50%',
            top: '50%',
          }}
        />
      )}
    </motion.div>
  );
}, (prev, next) => {
  // Only re-render if participant, size, target position, or hover state changed
  return (
    prev.participant.id === next.participant.id &&
    prev.size === next.size &&
    prev.state.targetX === next.state.targetX &&
    prev.state.targetY === next.state.targetY &&
    prev.isHovered === next.isHovered &&
    prev.glow === next.glow
  );
});

export function AnimatedCrowd({ participants, className = "", onShow, onArmHide, onHideNow, glow = false, speedMultiplier = 1 }: AnimatedCrowdProps) {
  const [visibleParticipants, setVisibleParticipants] = useState<LiveParticipant[]>([]);
  const [roamingStates, setRoamingStates] = useState<Map<string, RoamingState>>(new Map());
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Latest visible set, kept ref-synced so the (stable) pointer handler can
  // resolve participants without re-binding on every render.
  const visibleRef = useRef<LiveParticipant[]>([]);
  useEffect(() => {
    visibleRef.current = visibleParticipants;
  }, [visibleParticipants]);

  const hoveredIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number } | null>(null);

  const fullPool = useMemo(() => participants, [participants]);
  // Mobile / touch: static decorative avatars only (see render below).
  // Roaming tweens, breathing loops, glow halos, image preloading and the
  // document-level pointermove hit-testing are all skipped.
  const isMobile = useIsMobile();

  // Page Visibility API - pause when tab inactive
  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Preload all avatar images once — page waits until decoded (sab aajaye phir dikhe)
  // Skipped on mobile: the static fallback renders without waiting.
  useEffect(() => {
    if (isMobile) return;
    const urls = PREDEFINED_AVATARS.map((a) => a.url);
    // Also include any participant-specific avatarUrls that may be custom
    const custom = fullPool.map((p) => p.avatarUrl).filter(Boolean) as string[];
    const allUrls = Array.from(new Set([...urls, DEFAULT_AVATAR_URL, ...custom]));
    let cancelled = false;
    void preloadImages(allUrls, 2500).then(() => {
      if (!cancelled) setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fullPool, isMobile]);

  // Initial spawn — only after images are decoded, so no empty rings / lazy pop-in
  // After initial gate, incrementally add new participants (waiting room streams via interval)
  useEffect(() => {
    if (isMobile) return;
    if (!imagesReady) return;
    if (fullPool.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial spawn seeds visible avatars once images are decoded
    setVisibleParticipants((prev) => {
      if (prev.length === 0) return [...fullPool];
      // Add only newcomers
      const existing = new Set(prev.map((p) => p.id));
      const newcomers = fullPool.filter((p) => !existing.has(p.id));
      if (newcomers.length === 0) return prev;
      // Keep cap at MAX_VISIBLE if needed, but respect parent's slicing; just append
      return [...prev, ...newcomers].slice(-40);
    });

    setRoamingStates((prev) => {
      const next = new Map(prev);
      fullPool.forEach((p) => {
        if (!next.has(p.id)) {
          next.set(p.id, createRoamingState(speedMultiplier));
        }
      });
      return next;
    });
  }, [fullPool, imagesReady, speedMultiplier, isMobile]);

  // Roaming: move random avatars to new destinations every 8 seconds
  // Each avatar smoothly travels to its new position (no teleporting)
  // Disabled on mobile — avatars are static decoration there.
  useEffect(() => {
    if (isMobile) return;
    if (visibleParticipants.length === 0 || !isVisible) return;

    const roamingTimer = setInterval(() => {
      if (document.hidden) return;

      // Move 2-3 random avatars to new destinations
      const moveCount = Math.min(
        Math.max(2, Math.floor(visibleParticipants.length * 0.1)),
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
          next.set(p.id, createRoamingState(speedMultiplier));
        });
        return next;
      });
    }, 12000 / Math.max(0.25, speedMultiplier));

    return () => clearInterval(roamingTimer);
  }, [visibleParticipants, isVisible, speedMultiplier, isMobile]);

  const count = visibleParticipants.length;

  // ---------------------------------------------------------------------------
  // Reliable hover detection.
  //
  // Per-element mouseenter/mouseleave on continuously-moving avatars is
  // unreliable: every scale/rotate/roaming frame can move the hitbox out from
  // under the cursor and fire a spurious leave. Instead we hit-test with
  // document.elementFromPoint on every pointer move (rAF-throttled). This uses
  // the browser's real rendered geometry, so transformed/scaled/floating and
  // overlapping avatars are all resolved correctly, and because we only
  // re-evaluate when the pointer actually moves, the hover target stays stable
  // while an avatar drifts beneath a stationary cursor.
  // ---------------------------------------------------------------------------
  const resolveHoverTarget = useCallback(
    (x: number, y: number): { participant: LiveParticipant } | "keep" | null => {
      const el = document.elementFromPoint(x, y) as Element | null;
      if (!el) return null;
      // Cursor is over the preview card → keep the current participant alive.
      if (el.closest("[data-avatar-preview]")) return "keep";
      const avatarEl = el.closest<HTMLElement>("[data-participant-id]");
      if (!avatarEl) return null;
      const id = avatarEl.dataset.participantId;
      if (!id) return null;
      const participant = visibleRef.current.find((p) => p.id === id);
      return participant ? { participant } : null;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      // Hover is a mouse/pen concept; touch should not trigger previews.
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;

      const { clientX, clientY } = e;

      // Ignore tiny jitter but still keep the current hover alive (harmless
      // setState-with-same-reference bails out in React, so it is cheap).
      const last = lastMoveRef.current;
      if (last && Math.abs(last.x - clientX) < 3 && Math.abs(last.y - clientY) < 3) {
        const cur = hoveredIdRef.current
          ? visibleRef.current.find((p) => p.id === hoveredIdRef.current)
          : null;
        if (cur) onShow?.(cur);
        return;
      }
      lastMoveRef.current = { x: clientX, y: clientY };

      // Throttle the expensive hit-test to one per animation frame.
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const hit = resolveHoverTarget(clientX, clientY);

        if (hit === "keep") {
          const cur = hoveredIdRef.current
            ? visibleRef.current.find((p) => p.id === hoveredIdRef.current)
            : null;
          if (cur) onShow?.(cur);
          return;
        }

        if (hit) {
          const id = hit.participant.id;
          if (hoveredIdRef.current !== id) {
            // Switching to a new avatar.
            hoveredIdRef.current = id;
            setHoveredId(id);
            onShow?.(hit.participant);
          } else {
            // Stayed on the same avatar → keep the preview alive.
            onShow?.(hit.participant);
          }
        } else if (hoveredIdRef.current !== null) {
          // Cursor is outside every avatar/card → arm the delayed hide.
          hoveredIdRef.current = null;
          setHoveredId(null);
          onArmHide?.();
        }
      });
    },
    [resolveHoverTarget, onShow, onArmHide]
  );

  // Bind the document-level pointer tracking once.
  // Skipped on mobile: hover previews are a mouse/pen concept and the
  // per-frame elementFromPoint hit-testing wastes touch-device battery.
  useEffect(() => {
    if (isMobile) return;
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    // If the window loses focus, hide immediately.
    const handleBlur = () => onHideNow?.();
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handleBlur);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [handlePointerMove, onHideNow, isMobile]);

  // Mobile static fallback: deterministic scattered avatars, zero motion,
  // zero timers, zero listeners. Renders immediately from the prop pool.
  if (isMobile) {
    const statics = participants.slice(0, 8);
    return (
      <div className={`relative w-full h-full pointer-events-none opacity-70 ${className}`} aria-hidden="true">
        {statics.map((p, i) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${8 + ((i * 37 + 11) % 84)}%`,
              top: `${10 + ((i * 53 + 7) % 75)}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <StudentAvatar
              participant={p}
              index={i}
              count={statics.length}
              size={i % 4 === 0 ? "md" : "sm"}
              showName={false}
              showHoverCard={false}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!imagesReady) {
    // Gated skeleton — keeps layout stable until avatars decoded, then fades in
    return (
      <div className={`relative w-full h-full pointer-events-none ${className}`}>
        <div className="relative w-full h-full flex items-center justify-center" ref={containerRef}>
          <div className="flex items-center gap-2 opacity-60">
            <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse delay-100" />
            <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse delay-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full pointer-events-none ${className}`}>
      <div className="relative w-full h-full" ref={containerRef}>
        <AnimatePresence>
          {visibleParticipants.map((p, i) => {
            const state = roamingStates.get(p.id);
            if (!state) return null;

            const sizeVariant = (i % 4) as 0 | 1 | 2 | 3;
            const size = ["xs", "sm", "md", "lg"][sizeVariant] as "xs" | "sm" | "md" | "lg";
            const isHovered = hoveredId === p.id

            return (
              <MemoizedAvatar
                key={p.id}
                participant={p}
                index={i}
                count={count}
                size={size}
                state={state}
                isHovered={isHovered}
                glow={glow}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AnimatedCrowd;
