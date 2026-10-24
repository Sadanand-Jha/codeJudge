"use client";

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Eye, SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { TrapSurface } from "@/components/quiz/exam/TrapSurface";
import {
  TRAP_STRENGTHS,
  buildNoiseSvgDataUri,
  buildQuestionNote,
  buildTrapSvgDataUri,
  trapLinesForPlacement,
  wrapTrapText,
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

const GHOST_COLOR = "#1B183B";
const GHOST_INK_MIX = 0.05;
const GHOST_FONT_SIZE = 5;
const GHOST_WIDTH = 560;
const GHOST_HEIGHT = 7;
const GHOST_BLUR = "blur(0.5px)";

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseColor(raw: string): Rgba | null {
  const value = raw.trim().toLowerCase();
  if (!value || value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((character) => character + character)
        .join("");
    }
    if (digits.length !== 6 && digits.length !== 8) return null;
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const channel = (part: string) => {
      const numeric = Number(part.endsWith("%") ? part.slice(0, -1) : part);
      if (!Number.isFinite(numeric)) return NaN;
      return part.endsWith("%") ? (numeric / 100) * 255 : numeric;
    };
    const r = channel(parts[0]);
    const g = channel(parts[1]);
    const b = channel(parts[2]);
    if (![r, g, b].every(Number.isFinite)) return null;
    const rawAlpha = parts[3];
    const alpha =
      rawAlpha === undefined
        ? 1
        : Number(rawAlpha.endsWith("%") ? rawAlpha.slice(0, -1) : rawAlpha) /
          (rawAlpha.endsWith("%") ? 100 : 1);
    return {
      r: clampByte(r),
      g: clampByte(g),
      b: clampByte(b),
      a: Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1,
    };
  }

  const srgb = value.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i,
  );
  if (srgb) {
    return {
      r: clampByte(Number(srgb[1]) * 255),
      g: clampByte(Number(srgb[2]) * 255),
      b: clampByte(Number(srgb[3]) * 255),
      a: srgb[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(srgb[4]))),
    };
  }

  return null;
}

let colorCanvas: HTMLCanvasElement | null = null;

/** Fallback parser for computed colours such as `oklab(...)` that older
 * regex-based parsers cannot read. Canvas resolves them to sRGB. */
function resolveColor(raw: string): Rgba | null {
  const parsed = parseColor(raw);
  if (parsed) return parsed;
  if (typeof document === "undefined") return null;
  try {
    if (!colorCanvas) colorCanvas = document.createElement("canvas");
    const context = colorCanvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#000000";
    context.fillStyle = raw.trim();
    return parseColor(context.fillStyle);
  } catch {
    return null;
  }
}

function compositeForeground(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

/** Resolve the actual painted colour behind the ghost, including translucent
 * option states such as the selected row's 10% brand tint. */
function effectiveBackdrop(host: HTMLElement): Rgba {
  const layers: Rgba[] = [];
  let element: HTMLElement | null = host.parentElement;
  for (let depth = 0; element && depth < 10; depth += 1, element = element.parentElement) {
    const parsed = resolveColor(getComputedStyle(element).backgroundColor);
    if (parsed && parsed.a > 0) {
      layers.push(parsed);
      if (parsed.a >= 0.999) break;
    }
  }

  const fallback =
    resolveColor(getComputedStyle(host).getPropertyValue("--qs-bg")) ??
    { r: 18, g: 16, b: 43, a: 1 };
  let result: Rgba = { ...fallback, a: 1 };
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    result = compositeForeground(layers[index], result);
  }
  return result;
}

/** Move the backdrop 5% toward the readable ink colour. On the dark exam
 * canvas (#120D2B) this lands at roughly #1D1836, matching the surrounding UI
 * instead of the old grey #222235. */
function ghostColorFor(background: Rgba, ink: Rgba): string {
  const mix = (from: number, to: number) => clampByte(from + (to - from) * GHOST_INK_MIX);
  return `#${[mix(background.r, ink.r), mix(background.g, ink.g), mix(background.b, ink.b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

const GHOST_FONT_FAMILY = "Arial, Inter, sans-serif";
const QUESTION_NOTE_FONT_SIZE = 6.2;

export interface TrapGhostProps {
  trap: QuizTrap | null | undefined;
  strength: number;
  className?: string;
  /** Static-looking lead-in so the line reads like footer/legal microcopy. */
  prefix?: string;
  /** Re-read the backdrop when the surrounding surface changes (e.g. select). */
  surfaceKey?: string | number;
  /** Full override text (the question note). */
  text?: string;
  /** Wrap to the measured host width instead of drawing one clipped line. */
  wrap?: boolean;
  maxLines?: number;
  fontSize?: number;
  height?: number;
  opacity?: number;
  outline?: boolean;
}

/**
 * Extra-low-contrast OCR bait near the decoy option and the footer border.
 * Like AiTrap it is pixel-only: the instruction lives in an SVG background,
 * never in the DOM text.
 */
function TrapGhostLayer({
  trap,
  strength,
  className,
  prefix = "",
  surfaceKey = "",
  text,
  wrap = false,
  maxLines = 2,
  fontSize = GHOST_FONT_SIZE,
  height = GHOST_HEIGHT,
  opacity: opacityOverride,
  outline = false,
}: TrapGhostProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [color, setColor] = useState(GHOST_COLOR);
  const [hostWidth, setHostWidth] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      const style = getComputedStyle(host);
      const parsedInk = resolveColor(style.getPropertyValue("--qs-ink"));
      const ink =
        parsedInk && parsedInk.a > 0
          ? parsedInk
          : { r: 241, g: 238, b: 255, a: 1 };
      const next = ghostColorFor(effectiveBackdrop(host), ink);
      setColor((previous) => (previous === next ? previous : next));
    };
    read();
    // Let the theme bridge settle before the final colour read.
    const timer = window.setTimeout(read, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [surfaceKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setHostWidth(host.clientWidth);
    measure();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const rawLine = text ?? `${prefix}${trap?.line2 ?? ""}`;
  const artLines = useMemo(() => {
    if (!rawLine) return [];
    if (!wrap) return [rawLine];
    const available = hostWidth > 0 ? hostWidth : GHOST_WIDTH;
    const maxChars = Math.max(12, Math.floor(available / (fontSize * 0.52)));
    return wrapTrapText(rawLine, maxChars, maxLines);
  }, [rawLine, wrap, hostWidth, fontSize, maxLines]);

  const artLineKey = artLines.join("\n");
  const svgWidth = wrap && hostWidth > 0 ? Math.ceil(hostWidth) : GHOST_WIDTH;
  const resolvedHeight = wrap
    ? Math.max(1, Math.ceil((fontSize / 0.92) * Math.max(1, artLines.length)))
    : height;

  const backgroundImage = useMemo(() => {
    if (!trap || !artLineKey) return "none";
    return buildTrapSvgDataUri({
      lines: artLineKey.split("\n"),
      width: svgWidth,
      height: resolvedHeight,
      color,
      fontSize,
      fontFamily: GHOST_FONT_FAMILY,
    });
  }, [trap, artLineKey, svgWidth, resolvedHeight, color, fontSize]);

  if (!trap) return null;

  const opacity =
    opacityOverride ?? Math.min(0.04, Math.max(0.02, strength / 200));

  return (
    <span
      ref={hostRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        display: "block",
        height: resolvedHeight,
        opacity,
        filter: GHOST_BLUR,
        pointerEvents: "none",
        userSelect: "none",
        backgroundImage,
        backgroundSize: wrap && hostWidth > 0 ? "100% 100%" : "auto 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        ...(outline
          ? {
              outline: "1px dashed var(--qs-brand)",
              outlineOffset: "2px",
            }
          : {}),
      }}
    />
  );
}

export const TrapGhost = memo(TrapGhostLayer);

export interface QuestionNoteTrapProps {
  trap: QuizTrap;
  strength: number;
  outline?: boolean;
  className?: string;
}

/** Question-area system-note bait: wrapped, background-matched, blurred. */
function QuestionNoteTrapLayer({
  trap,
  strength,
  outline = false,
  className,
}: QuestionNoteTrapProps) {
  const note = useMemo(() => buildQuestionNote(trap), [trap]);
  return (
    <TrapGhost
      trap={trap}
      strength={strength}
      text={note}
      wrap
      maxLines={2}
      fontSize={QUESTION_NOTE_FONT_SIZE}
      opacity={Math.min(0.04, Math.max(0.02, strength / 200 + 0.01))}
      outline={outline}
      className={className}
    />
  );
}

export const QuestionNoteTrap = memo(QuestionNoteTrapLayer);

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
