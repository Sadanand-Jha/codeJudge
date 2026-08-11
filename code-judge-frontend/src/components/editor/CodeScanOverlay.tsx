"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { Loader2 } from "lucide-react";

const STATUSES = [
  "Scanning your code...",
  "Understanding code...",
  "Preparing AI context...",
];

const PREPARING_STATUS = "AI is preparing changes...";

const SCAN_DURATION = 2.4; // seconds for the top → bottom sweep
const LINE_HEIGHT = 64; // px height of the scan line

/**
 * Premium "Lens-style" scanning overlay rendered over the Monaco editor.
 *
 * Two modes:
 *  - one-shot (`loop=false`, the default): sweeps top → bottom while cycling a
 *    status label, then calls `onComplete` so the editor can fire the AI request.
 *  - looping (`loop=true`): keeps sweeping up and down continuously with a
 *    "AI is preparing changes…" label. Used while the AI generates edits; the
 *    caller unmounts it when generation finishes.
 *
 * Owns its own timeline and cleans up all timers/animation on unmount.
 */
export default function CodeScanOverlay({
  onComplete,
  loop = false,
}: {
  onComplete?: () => void;
  loop?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef<undefined | (() => void)>(onComplete);
  const loopRef = useRef(loop);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [phase, setPhase] = useState(0);
  const [range, setRange] = useState(0);

  // Animated scan-line position (0 → range px).
  const progress = useMotionValue(0);
  const top = useTransform(progress, (v) => `${v * range}px`);

  // Measure the overlay so the line travels the full editor height.
  useEffect(() => {
    const el = containerRef.current;
    if (el) setRange(Math.max(0, el.clientHeight - LINE_HEIGHT));
  }, []);

  // Drive the timeline once on mount. In looping mode the sweep repeats
  // forever; otherwise it plays the fixed "analyzing" sequence once.
  useEffect(() => {
    const sweep = (duration: number, target: 1 | 0) =>
      animate(progress, target, { duration, ease: "easeInOut" });

    const timers: ReturnType<typeof setTimeout>[] = [];
    const line = sweep(SCAN_DURATION, 1);

    if (loopRef.current) {
      const loopForever = () => {
        sweep(SCAN_DURATION * 1.3, 0).then(() => {
          sweep(SCAN_DURATION * 1.3, 1).then(loopForever);
        });
      };
      line.then(loopForever);
    } else {
      const t1 = setTimeout(() => setPhase(1), 950);
      const t2 = setTimeout(() => setPhase(2), 1850);
      const t3 = setTimeout(() => line.stop(), 2650);
      const t4 = setTimeout(() => onCompleteRef.current?.(), 3200);
      timers.push(t1, t2, t3, t4);
    }

    return () => {
      line.stop();
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {/* Dim the code slightly while scanning (not permanently). */}
      <div
        ref={containerRef}
        className="pointer-events-auto absolute inset-0 bg-[#1a1a1a]/45 backdrop-blur-[1px]"
      />

      {/* Soft ambient highlight that follows the sweep. */}
      <motion.div
        className="pointer-events-none absolute inset-x-0"
        style={{ top }}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 rounded-full bg-[#7C3AED]/10 blur-2xl" />
      </motion.div>

      {/* The glowing scan line. */}
      <motion.div
        className="pointer-events-none absolute inset-x-0"
        style={{ top, height: LINE_HEIGHT }}
      >
        <div className="pointer-events-none h-full w-full bg-gradient-to-b from-transparent via-[#7C3AED]/10 to-transparent" />
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#EC4899] to-transparent"
          style={{ boxShadow: "0 0 14px rgba(236,72,153,0.65)" }}
        />
        <div className="pointer-events-none absolute inset-x-1/4 top-1/2 h-3 -translate-y-1/2 rounded-full bg-[#EC4899]/25 blur-md" />
      </motion.div>

      {/* Status pill. */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: 24 }}>
        <div className="flex items-center gap-2 rounded-full border border-[#EC4899]/30 bg-[#1e1e1e]/90 px-4 py-2 text-xs font-medium text-[#F8F8F2] shadow-[0_0_24px_rgba(124,58,237,0.3)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EC4899]" />
          {loop ? PREPARING_STATUS : STATUSES[phase]}
        </div>
      </div>
    </motion.div>
  );
}
