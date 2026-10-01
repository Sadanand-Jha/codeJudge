"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/helpers";

interface AiStreamTextProps {
  text: string;
  className?: string;
  /** Approximate visible word tokens revealed per second. */
  tokensPerSecond?: number;
  cursor?: boolean;
}

/** One-shot, viewport-aware text reveal that resembles a live AI response. */
export function AiStreamText({
  text,
  className,
  tokensPerSecond = 20,
  cursor = true,
}: AiStreamTextProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [started, setStarted] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState(0);
  const tokens = useMemo(() => text.match(/\S+\s*/g) ?? (text ? [text] : []), [text]);
  const complete = visibleTokens >= tokens.length;

  useEffect(() => {
    const node = hostRef.current;
    if (!node || started) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleTokens(tokens.length);
      setStarted(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setStarted(true);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started, tokens.length]);

  useEffect(() => {
    if (!started || complete) return;
    const timer = window.setTimeout(
      () => setVisibleTokens((count) => Math.min(tokens.length, count + 1)),
      1_000 / Math.max(1, tokensPerSecond)
    );
    return () => window.clearTimeout(timer);
  }, [complete, started, tokens.length, tokensPerSecond, visibleTokens]);

  return (
    <span ref={hostRef} className={cn("inline", className)} aria-label={text}>
      <span aria-hidden="true">{tokens.slice(0, visibleTokens).join("")}</span>
      {cursor && started && !complete && (
        <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-px translate-y-[0.12em] animate-pulse bg-current opacity-60" />
      )}
    </span>
  );
}
