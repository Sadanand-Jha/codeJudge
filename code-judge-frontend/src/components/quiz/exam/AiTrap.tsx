"use client";

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Eye, SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { TrapSurface } from "@/components/quiz/exam/TrapSurface";
import {
  TRAP_STRENGTHS,
  buildNoiseSvgDataUri,
  buildTrapSvgDataUri,
  trapLinesForPlacement,
  type QuizTrap,
  type TrapPlacement,
} from "@/lib/aiTrap";

const PLACEMENT_META: Record<TrapPlacement, { height: number; fontSize: number }> = {
  "question-gap": { height: 13, fontSize: 12 },
  "under-options": { height: 30, fontSize: 12 },
  "between-card-footer": { height: 58, fontSize: 14 },
  monitoring: { height: 12, fontSize: 11 },
};

const ART_CACHE = new Map<string, { text: string; noise: string }>();
const ART_CACHE_LIMIT = 160;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normaliseCssColor(raw: string): string {
  const value = raw.trim();
  if (!value) return "rgb(120, 120, 120)";

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) return `rgb(${rgb[1]})`;

  const srgb = value.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i,
  );
  if (srgb) {
    const toByte = (channel: string) => Math.max(0, Math.min(255, Math.round(Number(channel) * 255)));
    return `rgb(${toByte(srgb[1])}, ${toByte(srgb[2])}, ${toByte(srgb[3])})`;
  }
  return value;
}

function cachedArtwork(key: string, factory: () => { text: string; noise: string }) {
  const cached = ART_CACHE.get(key);
  if (cached) return cached;
  const art = factory();
  if (ART_CACHE.size >= ART_CACHE_LIMIT) {
    const oldest = ART_CACHE.keys().next().value;
    if (oldest) ART_CACHE.delete(oldest);
  }
  ART_CACHE.set(key, art);
  return art;
}

export interface AiTrapProps {
  trap: QuizTrap | null | undefined;
  placement: TrapPlacement;
  strength: number;
  outline: boolean;
  className?: string;
}

/**
 * Pixel-only trap surface. It deliberately renders no children, no aria label,
 * no title and no HTML comment — the lines exist only inside an encoded SVG
 * background-image.
 */
function AiTrapLayer({ trap, placement, strength, outline, className }: AiTrapProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const { theme } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [color, setColor] = useState("rgb(120, 120, 120)");
  const meta = PLACEMENT_META[placement];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };
    measure();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      const next = normaliseCssColor(getComputedStyle(host).color);
      setColor((previous) => (previous === next ? previous : next));
    };
    read();
    // The theme bridge crossfades tokens; read again once it settles.
    const timer = window.setTimeout(read, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [theme, strength]);

  const artwork = useMemo(() => {
    if (!trap || size.width <= 0 || size.height <= 0) {
      return { text: "", noise: "" };
    }
    const lines = trapLinesForPlacement(trap, placement);
    const key = [
      placement,
      color,
      Math.round(size.width),
      Math.round(size.height),
      meta.fontSize,
      ...lines,
    ].join("|");
    return cachedArtwork(key, () => ({
      text: buildTrapSvgDataUri({
        lines,
        width: size.width,
        height: size.height,
        color,
        fontSize: meta.fontSize,
      }),
      noise: buildNoiseSvgDataUri(color, hashString(key)),
    }));
  }, [trap, placement, color, size.width, size.height, meta.fontSize]);

  if (!trap) return null;

  const style: CSSProperties & Record<string, string | number> = {
    "--surface": "var(--qs-surface)",
    "--ink": "var(--qs-ink)",
    "--trap-strength": `${strength}%`,
    "--trap":
      "color-mix(in srgb, var(--surface) calc(100% - var(--trap-strength)), var(--ink))",
    color: "var(--trap)",
    position: "absolute",
    display: "block",
    height: meta.height,
    pointerEvents: "none",
    userSelect: "none",
    backgroundImage:
      artwork.text && artwork.noise
        ? `${artwork.text}, ${artwork.noise}`
        : "none",
    backgroundSize: "100% 100%, 140px 56px",
    backgroundRepeat: "no-repeat, repeat",
    backgroundPosition: "left top, left top",
    ...(outline
      ? {
          outline: "1px dashed var(--qs-brand)",
          outlineOffset: "2px",
        }
      : {}),
  };

  return <TrapSurface ref={hostRef} placement={placement} className={className} style={style} />;
}

export const AiTrap = memo(AiTrapLayer);

const GHOST_COLOR = "#222235";
const GHOST_FONT_SIZE = 5;
const GHOST_WIDTH = 420;
const GHOST_HEIGHT = 6;

export interface TrapGhostProps {
  trap: QuizTrap | null | undefined;
  strength: number;
  className?: string;
}

/**
 * Extra-low-contrast OCR bait near the decoy option and the footer border.
 * Like AiTrap it is pixel-only: the instruction lives in an SVG background,
 * never in the DOM text.
 */
function TrapGhostLayer({ trap, strength, className }: TrapGhostProps) {
  const backgroundImage = useMemo(() => {
    if (!trap) return "none";
    return buildTrapSvgDataUri({
      lines: [trap.line2],
      width: GHOST_WIDTH,
      height: GHOST_HEIGHT,
      color: GHOST_COLOR,
      fontSize: GHOST_FONT_SIZE,
      fontFamily: "Arial, Inter, sans-serif",
    });
  }, [trap]);

  if (!trap) return null;

  const opacity = Math.min(0.03, Math.max(0.01, strength / 200));

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        display: "block",
        height: GHOST_HEIGHT,
        opacity,
        pointerEvents: "none",
        userSelect: "none",
        backgroundImage,
        backgroundSize: "auto 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
      }}
    />
  );
}

export const TrapGhost = memo(TrapGhostLayer);

export interface TrapCalibrationProps {
  value: number;
  defaultValue: number;
  outline: boolean;
  onChange: (value: number) => void;
  onOutlineChange: (value: boolean) => void;
}

/** Teacher/admin-only overlay enabled by ?trapcal=1. */
export function TrapCalibrationPanel({
  value,
  defaultValue,
  outline,
  onChange,
  onOutlineChange,
}: TrapCalibrationProps) {
  return (
    <aside
      className="qs-ui fixed bottom-24 right-4 z-[140] w-[min(92vw,310px)] rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 text-[var(--qs-ink)] shadow-[0_6px_0_rgba(26,18,64,0.2)]"
      aria-label="Trap calibration"
    >
      <div className="mb-2 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-[var(--qs-brand)]" />
        <p className="text-xs font-extrabold uppercase tracking-[0.08em]">Trap calibration</p>
        <span className="ml-auto rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[10px] font-bold text-[var(--qs-muted)]">
          default {defaultValue}%
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {TRAP_STRENGTHS.map((strength) => (
          <button
            key={strength}
            type="button"
            aria-pressed={strength === value}
            onClick={() => onChange(strength)}
            className={`rounded-lg border-2 px-1 py-1.5 text-[11px] font-extrabold transition-colors ${
              strength === value
                ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
            }`}
          >
            {strength}%
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={outline}
        onClick={() => onOutlineChange(!outline)}
        className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-[11px] font-extrabold transition-colors ${
          outline
            ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]"
            : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-ink)]"
        }`}
      >
        <Eye className="h-3.5 w-3.5" /> Outline trap areas
      </button>
      <p className="mt-2 text-[10px] leading-4 text-[var(--qs-muted)]">
        Calibration is server-defaulted and never stored in localStorage.
      </p>
    </aside>
  );
}
