"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import AiAssistantPanel from "@/components/ai/AiAssistantPanel";

const AI_SCOPE_SELECTOR = "[data-ai-scope]";

/**
 * Vertical "AI Assistant" strip fixed to the extreme right edge of the
 * viewport. Stays put while scrolling and never pushes page content.
 *
 * On desktop it is a slim, glowing, vertically-read label. On hover it
 * widens slightly, intensifies its glow and reveals a tooltip.
 *
 * On mobile it collapses into a compact bottom-right pill.
 *
 * Opening the strip:
 *  - flips the page into "AI mode" (a smooth pink→purple→blue palette shift
 *    via [data-ai-mode] on the app's data-ai-scope root, 600ms ease), giving a
 *    "you just upgraded" feel;
 *  - renders the AiAssistantPanel over the right ~1/3 of the screen (the panel
 *    manages its own close, and removes AI mode shortly after it exits).
 */
export default function AiAssistantStrip() {
  const [open, setOpen] = useState(false);

  const label = "✨ AI ASSISTANT";

  // Toggle page-wide AI mode with the panel lifecycle. The page keeps the
  // AI palette for slightly longer than the panel exit so the close feels
  // seamless (no sudden color snap while the panel fades out).
  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(AI_SCOPE_SELECTOR);
    if (!scope) return;
    if (open) {
      scope.setAttribute("data-ai-mode", "");
    } else {
      const t = window.setTimeout(() => {
        scope.removeAttribute("data-ai-mode");
      }, 380);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <>
      {/* ===== Desktop / tablet: slim vertical strip ===== */}
      <div
        className="fixed top-[30vh] right-0 z-[50] hidden lg:block"
        aria-label="AI Assistant"
        data-ai-ignore
      >
        <div className="group relative flex items-center">
          {/* Tooltip — revealed on hover */}
          <div
            role="tooltip"
            className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-text-secondary shadow-xl group-hover:inline-block"
          >
            Ask AI • Upload documents • Get help
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-0 h-0 w-0 -translate-y-1/2 border-y-[5px] border-l-[6px] border-y-transparent border-l-border"
            />
          </div>

          {/* Strip body */}
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            whileTap={{ scale: 0.96 }}
            className="pointer-events-auto relative flex h-[220px] w-[36px] shrink-0 items-center justify-center rounded-l-2xl bg-gradient-to-b from-[#EC4899] to-[#7C3AED] text-[10px] font-extrabold text-white tracking-wider transition-all duration-300 group-hover:w-[44px]"
            style={{ animation: "ai-glow 4.5s ease-in-out infinite" }}
            title="AI Assistant"
            aria-label="Open AI Assistant"
          >
            {/* Rotated spine text (reads bottom→up when on the right edge) */}
            <span className="-rotate-90 transform whitespace-nowrap leading-tight">
              {label}
            </span>

            {/* Traveling shimmer */}
            <span
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-l-2xl"
              aria-hidden="true"
            >
              <span
                className="absolute top-0 left-0 h-full w-[6px] -translate-x-full bg-gradient-to-b from-transparent via-white/35 to-transparent opacity-60"
                style={{ animation: "ai-shimmer 7s ease-in-out 0.3s infinite" }}
              />
            </span>

            {/* Drifting sparkles */}
            <Sparkles
              className="absolute top-4 left-1/2 h-3 w-3 -translate-x-1/2 text-white/70"
              style={{ animation: "ai-sparkle 5s ease-in-out infinite" }}
            />
            <Sparkles
              className="absolute bottom-5 left-1/3 h-2.5 w-2.5 -translate-x-1/2 text-white/60"
              style={{ animation: "ai-sparkle 6s 0.8s ease-in-out infinite" }}
            />
          </motion.button>
        </div>
      </div>

      {/* ===== Mobile: compact bottom-right pill ===== */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[50] lg:hidden" data-ai-ignore>
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          whileTap={{ scale: 0.95 }}
          className="pointer-events-auto flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#7C3AED] px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-105 active:scale-[0.95]"
          style={{ animation: "ai-glow 5s ease-in-out infinite" }}
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistant
        </motion.button>
      </div>

      {/* The sliding AI workspace panel */}
      <AiAssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
