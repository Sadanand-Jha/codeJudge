"use client";

import { useEffect, useRef, useState } from "react";

/** Live "now" timestamp that refreshes on an interval — safe for render. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

export function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;

  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function isUpcoming(c: { starttime: string | null }, now: number): boolean {
  return !!c.starttime && new Date(c.starttime).getTime() > now;
}

export function formatStartsIn(target: string | null, now: number): string {
  if (!target) return "TBD";
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "Started";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatDuration(duration: number | null): string {
  if (!duration) return "—";
  if (duration >= 60) {
    const h = Math.floor(duration / 60);
    const m = duration % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${duration} min`;
}

export function formatDate(starttime: string | null): string {
  if (!starttime) return "—";
  return new Date(starttime).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type ContestState = "live" | "upcoming" | "past";

/** A contest is live from its start time until start + duration. */
export function getContestState(
  c: { starttime: string | null; duration: number | null },
  now: number,
): ContestState {
  if (!c.starttime) return "past";
  const start = new Date(c.starttime).getTime();
  if (start > now) return "upcoming";
  const end = start + (c.duration ?? 120) * 60000;
  return now < end ? "live" : "past";
}

export function contestEndIso(c: { starttime: string | null; duration: number | null }): string | null {
  if (!c.starttime) return null;
  return new Date(new Date(c.starttime).getTime() + (c.duration ?? 120) * 60000).toISOString();
}

/* ---- Display enrichment (backend model is thin: name/start/duration) ---- */

const PRIZE_POOL = ["₹5,000", "₹10,000", "₹25,000", "₹1,00,000"];
const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const CATEGORY_IDS = [
  "cp",
  "dsa",
  "ai",
  "web",
  "math",
  "aptitude",
  "jee",
  "neet",
  "gate",
  "ssc",
  "upsc",
  "college",
  "open",
];

function hashStr(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function seededParticipants(id: number): number {
  return 700 + ((Math.abs(id) * 137) % 1300);
}

export function seededPrize(id: number): string {
  return PRIZE_POOL[Math.abs(id) % PRIZE_POOL.length];
}

export function seededDifficulty(id: number): (typeof DIFFICULTY_LEVELS)[number] {
  return DIFFICULTY_LEVELS[Math.abs(id) % DIFFICULTY_LEVELS.length];
}

export function seededProblemCount(id: number): number {
  return 4 + (Math.abs(id) % 5);
}

export function seededCategory(name: string): string {
  return CATEGORY_IDS[hashStr(name) % CATEGORY_IDS.length];
}

export function seededOrganizer(id: number): string {
  return ["ByteClash Arena", "CodeForge League", "AlgoNauts", "ProblemPool"][Math.abs(id) % 4];
}

export function seededYourRank(id: number): number {
  return 80 + ((Math.abs(id) * 53) % 480);
}

/** Animated counter that starts when the element scrolls into view. */
export function useCountUp(target: number, decimals = 0, duration = 1500) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Number((target * eased).toFixed(decimals)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, decimals, duration]);

  return { ref, val };
}