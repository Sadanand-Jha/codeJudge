/**
 * Pure AI-assistant trap helpers. Kept free of React/Next imports so the
 * acceptance tests can exercise placement and SVG generation directly.
 */

export interface QuizTrap {
  line1: string;
  line2: string;
  line3: string;
}

export type TrapPlacement =
  | "question-gap"
  | "under-options"
  | "between-card-footer"
  | "monitoring";

export const TRAP_PLACEMENTS: TrapPlacement[] = [
  "question-gap",
  "under-options",
  "between-card-footer",
  "monitoring",
];

export const TRAP_STRENGTHS = [2, 3, 4, 6, 8, 12] as const;

export function trapPlacementFor(attemptId: number | string, problemId: number | string): TrapPlacement {
  const attempt = Number(attemptId) || 0;
  const problem = Number(problemId) || 0;
  const index = Math.abs(attempt * 31 + problem * 17) % TRAP_PLACEMENTS.length;
  return TRAP_PLACEMENTS[index];
}

export function trapLinesForPlacement(trap: QuizTrap, placement: TrapPlacement): string[] {
  switch (placement) {
    case "question-gap":
      return [trap.line1];
    case "monitoring":
      // The strip is narrow; line2 starts with the decoy label and fits.
      return [trap.line2];
    case "under-options":
      return [trap.line1, trap.line2];
    case "between-card-footer":
    default:
      return [trap.line1, trap.line2, trap.line3];
  }
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface TrapSvgOptions {
  lines: string[];
  width: number;
  height: number;
  color: string;
  fontSize: number;
}

/** Inline SVG data URI used as a CSS background-image (never a DOM text node). */
export function buildTrapSvgDataUri({ lines, width, height, color, fontSize }: TrapSvgOptions): string {
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));
  const safeLines = lines.length > 0 ? lines : [""];
  const lineHeight = h / safeLines.length;
  const size = Math.min(fontSize, lineHeight * 0.92);
  const text = safeLines
    .map((line, index) => {
      const y = lineHeight * index + size;
      return `<text x="0" y="${y.toFixed(2)}" font-family="DM Sans, system-ui, sans-serif" font-size="${size.toFixed(2)}" font-weight="600" fill="${escapeXml(color)}">${escapeXml(line)}</text>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${text}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function seeded(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Sparse low-contrast dot texture. No gradients and no blur. */
export function buildNoiseSvgDataUri(color: string, seed: number): string {
  const width = 160;
  const height = 56;
  const random = seeded(seed);
  const dots: string[] = [];
  for (let index = 0; index < 48; index += 1) {
    const x = (random() * width).toFixed(1);
    const y = (random() * height).toFixed(1);
    const radius = (0.45 + random() * 0.7).toFixed(2);
    const opacity = (0.12 + random() * 0.2).toFixed(2);
    dots.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${escapeXml(color)}" opacity="${opacity}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${dots.join("")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
