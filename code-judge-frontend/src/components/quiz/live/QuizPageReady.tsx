"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/helpers";

/**
 * QuizPageReady — "render completely, then reveal" gate for mobile.
 *
 * On phones / touch devices the quiz pages mount dozens of animated layers
 * (confetti, roaming avatars, blurred nebulas). Showing the page immediately
 * means the user watches half-rendered frames jank into place while images
 * and fonts are still decoding.
 *
 * On mobile this keeps the real content in the layout (so it fully renders
 * and decodes) but hidden under a cheap static splash, then reveals it once:
 * two animation frames have passed (layout + paint done) AND webfonts are
 * ready — with a 2.5s safety timeout so the page can never block forever.
 * On desktop it renders children directly with zero behavior change.
 */
export default function QuizPageReady({
  children,
  className,
  label = "Loading quiz",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      // Deferred so this stays a passive effect (no synchronous setState).
      const raf = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(raf);
    }
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    const show = () => {
      if (!cancelled) setReady(true);
    };
    // Safety net — never trap the user behind the splash.
    const safety = window.setTimeout(show, 2500);
    // Two RAFs: React commit + browser layout/paint have happened.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (document.fonts?.ready) {
          // Fonts ready (or already loaded) → reveal. Race against safety.
          document.fonts.ready.then(show).catch(show);
        } else {
          show();
        }
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isMobile]);

  if (!isMobile) return <>{children}</>;

  return (
    <div className={cn("relative", className)} aria-busy={!ready}>
      {/* Real content stays in layout so it renders/decodes, hidden until ready. */}
      <div className={cn("h-full min-h-0 transition-opacity duration-300", ready ? "opacity-100" : "invisible")}>
        {children}
      </div>
      {!ready && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#FFF9F1] dark:bg-[#0B0D10]"
          aria-hidden="true"
          aria-label={label}
        >
          {/* Pure-CSS spinner — no JS animation loop, no framer-motion. */}
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-violet-500/20 border-t-violet-500" />
          <span className="text-xs font-semibold text-[#667085] dark:text-[#8F9AAF]">
            Preparing your quiz…
          </span>
        </div>
      )}
    </div>
  );
}
