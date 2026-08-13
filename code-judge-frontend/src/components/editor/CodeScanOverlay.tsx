"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { editor } from "monaco-editor";
import { motion, useAnimationControls } from "framer-motion";
import { Loader2 } from "lucide-react";

type MonacoEditor = editor.IStandaloneCodeEditor;
type MonacoModel = editor.ITextModel;
type MonacoApi = typeof import("monaco-editor");

const STATUSES = [
  "Scanning your code...",
  "Understanding code...",
  "Preparing AI context...",
];

const PREPARING_STATUS = "AI is preparing changes...";

const EASE = "cubic-bezier(0.33, 1, 0.4, 1)";

type PlanSegment =
  | { type: "move"; from: number; to: number; dur: number }
  | { type: "pause"; line: number; dur: number };

interface WindowState {
  top: number;
  height: number;
  left: number;
  width: number;
  transition: string;
  paused: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Builds the "AI reads the file" timeline: variable-speed selection moves that
 * progress top → bottom, with a few deliberate "AI found something" stops.
 * Timing is tastefully random but never chaotic.
 */
function buildPlan(first: number, last: number, loopMode: boolean): PlanSegment[] {
  const span = last - first + 1;
  const segments: PlanSegment[] = [];
  if (span <= 0) return segments;

  // Chunk width adapts to file size so the scan never turns frantic.
  const maxChunk = span <= 24 ? 3 : span <= 60 ? 4 : span <= 140 ? 6 : 9;
  const ideal = clamp(span / (loopMode ? 14 : 8), 0.8, maxChunk);

  const moves: { from: number; to: number }[] = [];
  let cursor = first;
  while (cursor <= last && moves.length < 400) {
    const chunk = Math.max(1, Math.round(ideal * (0.5 + Math.random() * 1.4)));
    const to = Math.min(last, cursor + clamp(chunk, 1, maxChunk) - 1);
    moves.push({ from: cursor, to });
    cursor = to + 1;
  }

  // Sprinkle a few "stopped to think" pauses through the file.
  const stopIndices = new Set<number>();
  const minStops = span >= 24 ? 2 : span >= 10 ? 1 : 0;
  const stopCount = clamp(Math.round(moves.length * 0.18), minStops, 3);
  while (stopIndices.size < stopCount && moves.length > 2) {
    const i = 1 + Math.floor(Math.random() * Math.max(1, moves.length - 2));
    stopIndices.add(Math.min(i, moves.length - 1));
  }

  let movesDur = 0;
  let pausesDur = 0;
  moves.forEach((mv, i) => {
    const lines = mv.to - mv.from + 1;
    const slow = Math.random() < (lines >= 3 ? 0.4 : 0.15);
    const dur = slow ? rand(680, 1050) : rand(240, 520);
    movesDur += dur;
    segments.push({ type: "move", from: mv.from, to: mv.to, dur });

    if (stopIndices.has(i) && mv.to < last) {
      const long = Math.random() < 0.4;
      const pdur = long ? rand(1000, 1700) : rand(480, 900);
      pausesDur += pdur;
      segments.push({ type: "pause", line: mv.to, dur: pdur });
    }
  });

  const finalPause = rand(380, 650);
  pausesDur += finalPause;
  segments.push({ type: "pause", line: last, dur: finalPause });

  // One-shot scans get a time budget; loop/preparing scans keep natural pacing.
  if (!loopMode) {
    const budget = 3600 + Math.min(1400, span * 22);
    const total = movesDur + pausesDur;
    if (total > budget) {
      const scale = Math.max(0.2, (budget - pausesDur) / Math.max(1, movesDur));
      for (const s of segments) {
        if (s.type === "move") s.dur = Math.max(140, s.dur * scale);
      }
    }
  }

  return segments;
}

/**
 * A soft "code selection" scan rendered over the Monaco editor. The highlight
 * follows Monaco's actual line coordinates, only covering real code — never
 * the empty editor space. It reads top → bottom with variable speed and
 * occasional "AI is thinking here" pauses, then fades out.
 *
 * Two modes:
 *  - one-shot (`loop=false`): scans once then calls `onComplete` so the editor
 *    can fire the AI request.
 *  - looping (`loop=true`): scans once and then holds on the last chunk with a
 *    gentle pulse while the AI generates. The caller unmounts it when done.
 */
export default function CodeScanOverlay({
  onComplete,
  loop = false,
  editorRef,
  monacoRef,
}: {
  onComplete?: () => void;
  loop?: boolean;
  editorRef?: RefObject<MonacoEditor | null>;
  monacoRef?: RefObject<MonacoApi | null>;
}) {
  const onCompleteRef = useRef<undefined | (() => void)>(onComplete);
  const loopRef = useRef(loop);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const [win, setWin] = useState<WindowState>({
    top: 0,
    height: 0,
    left: 0,
    width: 0,
    transition: "none",
    paused: false,
  });
  const [fading, setFading] = useState(false);
  const [phase, setPhase] = useState(0);

  const deadRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const geomRef = useRef({ lineHeight: 21, left: 60, width: 640 });
  const rangeRef = useRef({ first: 1, last: 1 });
  const shimmerCtl = useAnimationControls();

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  };

  useEffect(() => {
    // StrictMode double-invokes effects in dev: reset the "dead" flag each run
    // so the second mount actually starts the scan.
    deadRef.current = false;
    const styleEl = document.createElement("style");
    styleEl.textContent = SCAN_CSS;
    document.head.appendChild(styleEl);

    const disposables: { dispose?: () => void }[] = [];
    let resizeObserver: ResizeObserver | null = null;
    let started = false;

    const ed = () => editorRef?.current;
    const mc = () => monacoRef?.current;

    // Only scan the meaningful code — skip leading/trailing blank lines.
    const meaningfulRange = (model: MonacoModel) => {
      const n = model.getLineCount();
      let lo = 1;
      let hi = n;
      while (lo <= n && !model.getLineContent(lo).trim()) lo++;
      while (hi >= lo && !model.getLineContent(hi).trim()) hi--;
      if (lo > hi) return { first: 1, last: 1, hasContent: false };
      return { first: lo, last: hi, hasContent: true };
    };

    const readFont = () => {
      let family = "Consolas, 'Courier New', monospace";
      let size = 13;
      try {
        const m = mc();
        const e = ed();
        if (m && e && m.editor.EditorOption?.fontInfo != null) {
          const fi = e.getOption(m.editor.EditorOption.fontInfo);
          if (fi?.fontFamily) family = fi.fontFamily;
          if (fi?.fontSize) size = fi.fontSize;
        }
      } catch {
        /* fall through to DOM measurement */
      }
      if (family === "Consolas, 'Courier New', monospace") {
        const el = ed()?.getDomNode?.()?.querySelector?.(".view-lines");
        const cs = el ? window.getComputedStyle(el) : null;
        if (cs?.fontFamily) family = cs.fontFamily;
        if (cs?.fontSize) size = parseFloat(cs.fontSize) || size;
      }
      return `${size}px ${family}`;
    };

    // Monaco's line height (fallback: measure a rendered line / default).
    const getLineHeight = () => {
      try {
        const m = mc();
        const e = ed();
        if (m && e && m.editor.EditorOption?.fontInfo != null) {
          const fi = e.getOption(m.editor.EditorOption.fontInfo);
          if (fi?.lineHeight) return fi.lineHeight;
        }
      } catch {
        /* fall through */
      }
      const el = ed()?.getDomNode?.()?.querySelector?.(".view-lines .view-line");
      const h = el ? el.getBoundingClientRect().height : 0;
      return h || 21;
    };

    // Measure the widest code line so the highlight hugs the code instead of
    // spanning the whole editor viewport.
    const measureCodeWidth = (model: MonacoModel) => {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return 0;
      ctx.font = readFont();
      let maxW = 0;
      for (let i = 1; i <= model.getLineCount(); i++) {
        const w = ctx.measureText(model.getLineContent(i)).width;
        if (w > maxW) maxW = w;
      }
      return maxW;
    };

    const refreshGeometry = (model: MonacoModel) => {
      const e = ed();
      if (!e) return;
      const layout = e.getLayoutInfo();
      const available = Math.max(1, layout.contentWidth);
      geomRef.current = {
        lineHeight: getLineHeight(),
        left: Math.max(0, layout.contentLeft - e.getScrollLeft()),
        width: clamp(measureCodeWidth(model) + 28, 40, available),
      };
    };

    // measureCodeWidth does a canvas measureText over every line, so coalesce
    // geometry refreshes instead of running one on every layout/content event.
    let geometryTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleGeometry = (model: MonacoModel) => {
      if (geometryTimer) return;
      geometryTimer = setTimeout(() => {
        geometryTimer = null;
        if (deadRef.current) return;
        refreshGeometry(model);
      }, 120);
    };

    // Monaco viewport y-coordinate of a line (handles vertical scroll).
    const lineTop = (line: number) => {
      const e = ed();
      if (!e) return 0;
      try {
        const p = e.getScrolledVisiblePosition({ lineNumber: line, column: 1 });
        if (p && typeof p.top === "number") return p.top;
      } catch {
        /* fall through */
      }
      try {
        return Math.max(0, e.getTopForLineNumber(line) - e.getScrollTop());
      } catch {
        return 0;
      }
    };

    // Page the editor down only when the scan leaves the visible area, like
    // the AI turning the page to keep reading.
    const keepInView = (line: number) => {
      const e = ed();
      if (!e || typeof e.getTopForLineNumber !== "function") return;
      const layout = e.getLayoutInfo();
      const abs = e.getTopForLineNumber(line);
      const rel = abs - e.getScrollTop();
      if (rel < 0) e.setScrollTop(Math.max(0, abs));
      else if (rel + geomRef.current.lineHeight > layout.height * 0.8) {
        e.setScrollTop(Math.max(0, abs - layout.height * 0.35));
      }
    };

    const commitWindow = (patch: Partial<WindowState>) =>
      setWin((w) => ({ ...w, ...patch }));

    const endScan = () => {
      if (deadRef.current) return;
      if (loopRef.current) {
        // Loop mode: pause on the last chunk, then jump back to the top and
        // scan again while the AI keeps preparing changes.
        commitWindow({ paused: true });
        later(() => {
          const { first, last } = rangeRef.current;
          playPlan(buildPlan(first, last, true));
        }, 400);
        return;
      }
      setFading(true);
      later(() => onCompleteRef.current?.(), 440);
    };

    const playPlan = (plan: PlanSegment[]) => {
      const firstSeg = plan[0];
      if (firstSeg?.type !== "move") {
        endScan();
        return;
      }

      // Prime the window on the first chunk without animating.
      const g = geomRef.current;
      keepInView(firstSeg.from);
      commitWindow({
        top: lineTop(firstSeg.from),
        height: (firstSeg.to - firstSeg.from + 1) * g.lineHeight,
        left: g.left,
        width: g.width,
        transition: "none",
        paused: false,
      });

      let idx = 0;
      const step = () => {
        if (deadRef.current) return;
        const seg = plan[idx++];
        if (!seg) {
          endScan();
          return;
        }
        const g2 = geomRef.current;

        if (seg.type === "move") {
          keepInView(seg.to);
          commitWindow({
            top: lineTop(seg.to),
            height: (seg.to - seg.from + 1) * g2.lineHeight,
            left: g2.left,
            width: g2.width,
            transition: `top ${seg.dur}ms ${EASE}, height ${seg.dur}ms ${EASE}`,
            paused: false,
          });
          later(step, seg.dur);
        } else {
          commitWindow({ paused: true });
          if (!loopRef.current) setPhase((p) => Math.min(p + 1, STATUSES.length - 1));
          shimmerCtl.stop();
          shimmerCtl.set({ x: "-130%", opacity: 0 });
          shimmerCtl.start({
            x: "220%",
            opacity: [0, 0.9, 0.9, 0],
            transition: {
              duration: Math.min(seg.dur * 0.7, 800),
              ease: "easeInOut",
              times: [0, 0.2, 0.8, 1],
            },
          });
          later(() => {
            commitWindow({ paused: false });
            step();
          }, seg.dur);
        }
      };
      later(step, 30);
    };

    const startScan = (e: MonacoEditor, model: MonacoModel) => {
      if (started) return;
      started = true;

      const { first, last, hasContent } = meaningfulRange(model);
      if (!hasContent) {
        endScan();
        return;
      }
      rangeRef.current = { first, last };

      refreshGeometry(model);
      const onLayout = () => scheduleGeometry(model);
      const layoutSub = e.onDidLayoutChange?.(onLayout);
      const contentSub = model.onDidChangeContent?.(onLayout);
      if (layoutSub) disposables.push(layoutSub);
      if (contentSub) disposables.push(contentSub);

      const dom = e.getDomNode?.();
      if (dom) {
        resizeObserver = new ResizeObserver(onLayout);
        resizeObserver.observe(dom);
      }

      playPlan(buildPlan(first, last, loopRef.current));
    };

    let attempt = 0;
    const boot = () => {
      if (deadRef.current) return;
      const e = ed();
      const model = e?.getModel?.();
      if (e && model) {
        startScan(e, model);
        return;
      }
      if (++attempt > 30) {
        if (!loopRef.current) onCompleteRef.current?.();
        return;
      }
      later(boot, 80);
    };
    boot();

    return () => {
      deadRef.current = true;
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      disposables.forEach((d) => d.dispose?.());
      resizeObserver?.disconnect();
      if (geometryTimer) clearTimeout(geometryTimer);
      styleEl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pointer-events-none relative h-full w-full overflow-hidden"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 320ms ease" }}
    >
      {/* Invisible input lock so the code can't be edited mid-scan. */}
      <div className="pointer-events-auto absolute inset-0" />

      {/* Soft code-selection window that follows Monaco's actual lines. */}
      <div
        className={
          win.paused ? "cv-ai-scan-window cv-ai-scan-window--paused" : "cv-ai-scan-window"
        }
        style={{
          top: win.top,
          height: win.height,
          left: win.left,
          width: win.width,
          transition: win.transition,
        }}
      >
        <span className="cv-ai-scan-screen" />
        <span className="cv-ai-scan-glow" />
        <motion.span
          className="cv-ai-scan-shimmer"
          initial={{ opacity: 0, x: "-130%" }}
          animate={shimmerCtl}
        />
      </div>

      {/* Status pill. */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: 24 }}>
        <div className="flex items-center gap-2 rounded-full border border-[#EC4899]/30 bg-[#1e1e1e]/90 px-4 py-2 text-xs font-medium text-[#F8F8F2] shadow-[0_0_24px_rgba(124,58,237,0.3)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EC4899]" />
          {loop ? PREPARING_STATUS : STATUSES[phase]}
        </div>
      </div>
    </div>
  );
}

const SCAN_CSS = `
.cv-ai-scan-window {
  position: absolute;
  pointer-events: none;
  border-radius: 6px;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    rgba(168, 85, 247, 0.16) 0%,
    rgba(168, 85, 247, 0.05) 16%,
    rgba(236, 72, 153, 0.05) 84%,
    rgba(236, 72, 153, 0.16) 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(168, 85, 247, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  will-change: top, height;
}
.cv-ai-scan-window::before,
.cv-ai-scan-window::after {
  content: "";
  position: absolute;
  top: 8%;
  bottom: 8%;
  width: 2px;
  border-radius: 2px;
  filter: blur(0.4px);
}
.cv-ai-scan-window::before {
  left: 0;
  background: linear-gradient(
    to bottom,
    rgba(236, 72, 153, 0),
    rgba(236, 72, 153, 0.55) 20%,
    rgba(168, 85, 247, 0.5) 50%,
    rgba(236, 72, 153, 0.55) 80%,
    rgba(236, 72, 153, 0)
  );
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
}
.cv-ai-scan-window::after {
  right: 0;
  background: linear-gradient(
    to bottom,
    rgba(168, 85, 247, 0),
    rgba(168, 85, 247, 0.5) 20%,
    rgba(236, 72, 153, 0.45) 50%,
    rgba(168, 85, 247, 0.5) 80%,
    rgba(168, 85, 247, 0)
  );
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
}
.cv-ai-scan-screen {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  mix-blend-mode: screen;
  background: linear-gradient(
    90deg,
    rgba(168, 85, 247, 0.06),
    rgba(236, 72, 153, 0.05)
  );
  opacity: 0;
  transition: opacity 300ms ease;
}
.cv-ai-scan-glow {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: radial-gradient(
    130% 160% at 50% 50%,
    rgba(168, 85, 247, 0) 30%,
    rgba(168, 85, 247, 0.16) 72%,
    rgba(236, 72, 153, 0.12) 100%
  );
  opacity: 0.55;
  transition: opacity 300ms ease;
  filter: blur(1px);
}
.cv-ai-scan-shimmer {
  position: absolute;
  top: -10%;
  bottom: -10%;
  left: 0;
  width: 38%;
  pointer-events: none;
}
.cv-ai-scan-shimmer::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(236, 72, 153, 0.14),
    rgba(168, 85, 247, 0.18),
    transparent
  );
  filter: blur(8px);
}
.cv-ai-scan-window--paused .cv-ai-scan-screen {
  opacity: 0.4;
}
.cv-ai-scan-window--paused .cv-ai-scan-glow {
  opacity: 1;
}
.cv-ai-scan-window--paused {
  animation: cv-ai-scan-pulse 1000ms ease-in-out infinite;
}
@keyframes cv-ai-scan-pulse {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px rgba(168, 85, 247, 0.18),
      0 0 18px rgba(168, 85, 247, 0.22),
      0 0 42px rgba(236, 72, 153, 0.14);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px rgba(236, 72, 153, 0.28),
      0 0 26px rgba(168, 85, 247, 0.34),
      0 0 56px rgba(236, 72, 153, 0.24);
  }
}
`;
