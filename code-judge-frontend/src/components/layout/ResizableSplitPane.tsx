"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "split-pane-left-width";

interface ResizableSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftMin?: number;
  rightMin?: number;
  storageKey?: string;
  editorLayout?: () => void;
}

export default function ResizableSplitPane({
  left,
  right,
  leftMin = 400,
  rightMin = 450,
  storageKey = STORAGE_KEY,
  editorLayout,
}: ResizableSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  const [leftWidth, setLeftWidth] = useState<number>(() => {
    try {
      if (typeof window === "undefined") return leftMin;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed >= leftMin) return parsed;
      }
    } catch {
      // ignore
    }
    return leftMin;
  });

  const dragState = useRef<{
    startX: number;
    startWidth: number;
    containerWidth: number;
    rafId: number | null;
  } | null>(null);

  const clampWidth = useCallback(
    (next: number, total: number) => {
      const effectiveLeftMin = Math.min(leftMin, total - rightMin);
      const effectiveRightMin = Math.min(rightMin, total - leftMin);
      return Math.max(effectiveLeftMin, Math.min(next, total - effectiveRightMin));
    },
    [leftMin, rightMin]
  );

  const saveWidth = useCallback(
    (width: number) => {
      try {
        localStorage.setItem(storageKey, String(width));
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current || !dividerRef.current) return;
      e.preventDefault();
      dividerRef.current.setPointerCapture(e.pointerId);

      const state = {
        startX: e.clientX,
        startWidth: leftWidth,
        containerWidth: containerRef.current.getBoundingClientRect().width,
        rafId: null as number | null,
      };
      dragState.current = state;

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const move = (ev: PointerEvent) => {
        const s = dragState.current;
        if (!s || !containerRef.current) return;

        if (s.rafId !== null) {
          cancelAnimationFrame(s.rafId);
        }

        s.rafId = requestAnimationFrame(() => {
          s.rafId = null;
          const total = s.containerWidth;
          const delta = ev.clientX - s.startX;
          const next = s.startWidth + delta;
          const clamped = clampWidth(next, total);
          setLeftWidth(clamped);
        });
      };

      const up = (ev: PointerEvent) => {
        const s = dragState.current;
        if (s) {
          if (s.rafId !== null) {
            cancelAnimationFrame(s.rafId);
          }
          saveWidth(s.startWidth);
        }
        dragState.current = null;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (dividerRef.current) {
          try {
            dividerRef.current.releasePointerCapture(ev.pointerId);
          } catch {
            // ignore
          }
        }
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [leftWidth, clampWidth, saveWidth]
  );

  // Flush final width on drag end
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (dragState.current === null && containerRef.current) {
        saveWidth(leftWidth);
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current, { attributes: false, childList: true, subtree: false });
    }
    return () => observer.disconnect();
  }, [leftWidth, saveWidth]);

  // Window resize: preserve ratio, clamp
  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current || dragState.current) return;
      const total = containerRef.current.getBoundingClientRect().width;
      const ratio = leftWidth / (leftWidth + rightMin);
      const desired = total * ratio;
      const clamped = clampWidth(desired, total);
      setLeftWidth(clamped);
      editorLayout?.();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [leftWidth, rightMin, clampWidth, editorLayout]);

  // Re-layout editor when left width changes while not dragging
  useEffect(() => {
    if (!dragState.current) {
      editorLayout?.();
    }
  }, [leftWidth, editorLayout]);

  const flexLeft = `0 0 ${leftWidth}px`;
  const flexRight = `1 1 0px`;

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden" style={{ flex: flexLeft }}>
        {left}
      </div>

      <div
        ref={dividerRef}
        onPointerDown={onPointerDown}
        className="w-[6px] shrink-0 cursor-col-resize bg-white/[0.06] hover:bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.5)] transition-colors select-none"
        style={{ touchAction: "none" }}
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ flex: flexRight }}>
        {right}
      </div>
    </div>
  );
}