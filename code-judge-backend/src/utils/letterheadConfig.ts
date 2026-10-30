export type HeaderAlign = "left" | "center" | "right";

export interface HeaderConfig {
  cropTop: number;
  cropHeight: number;
  widthPct: number;
  offsetXmm: number;
  offsetYmm: number;
  align: HeaderAlign;
  repeatOnAllPages: boolean;
}

export interface HeaderRect {
  x: number;
  y: number;
  w: number;
  h: number;
  bottom: number;
}

export const A4 = { w: 210, h: 297 };
export const MARGIN = 15;
export const MAX_HEADER_HEIGHT_MM = A4.h * 0.4;

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  cropTop: 0,
  cropHeight: 0.18,
  widthPct: 1,
  offsetXmm: 0,
  offsetYmm: 15,
  align: "center",
  repeatOnAllPages: false,
};

export const HEADER_LIMITS = {
  cropTop: { min: 0, max: 0.9 },
  cropHeight: { min: 0.05, max: 0.4 },
  widthPct: { min: 0.3, max: 1 },
  offsetXmm: { min: -40, max: 40 },
  offsetYmm: { min: 0, max: 60 },
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function isAlign(value: unknown): value is HeaderAlign {
  return value === "left" || value === "center" || value === "right";
}

function maxCropHeight(imageWidth: number, imageHeight: number, widthPct: number): number {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return HEADER_LIMITS.cropHeight.max;
  }
  const contentWidth = A4.w - 2 * MARGIN;
  const heightAtFullCrop = contentWidth * widthPct * (imageHeight / imageWidth);
  if (heightAtFullCrop <= MAX_HEADER_HEIGHT_MM) return HEADER_LIMITS.cropHeight.max;
  return Math.max(
    HEADER_LIMITS.cropHeight.min,
    Math.min(HEADER_LIMITS.cropHeight.max, MAX_HEADER_HEIGHT_MM / heightAtFullCrop)
  );
}

export function normalizeHeaderConfig(
  input: Partial<HeaderConfig> | null | undefined,
  imageWidth?: number,
  imageHeight?: number
): HeaderConfig {
  const source = { ...DEFAULT_HEADER_CONFIG, ...(input ?? {}) };
  const widthPct = clamp(
    source.widthPct,
    HEADER_LIMITS.widthPct.min,
    HEADER_LIMITS.widthPct.max,
    DEFAULT_HEADER_CONFIG.widthPct
  );
  const cropHeight = clamp(
    source.cropHeight,
    HEADER_LIMITS.cropHeight.min,
    Math.min(
      HEADER_LIMITS.cropHeight.max,
      maxCropHeight(Number(imageWidth ?? 0), Number(imageHeight ?? 0), widthPct)
    ),
    DEFAULT_HEADER_CONFIG.cropHeight
  );
  const cropTop = clamp(
    source.cropTop,
    HEADER_LIMITS.cropTop.min,
    Math.max(HEADER_LIMITS.cropTop.min, 1 - cropHeight),
    DEFAULT_HEADER_CONFIG.cropTop
  );
  return {
    cropTop,
    cropHeight,
    widthPct,
    offsetXmm: clamp(
      source.offsetXmm,
      HEADER_LIMITS.offsetXmm.min,
      HEADER_LIMITS.offsetXmm.max,
      DEFAULT_HEADER_CONFIG.offsetXmm
    ),
    offsetYmm: clamp(
      source.offsetYmm,
      HEADER_LIMITS.offsetYmm.min,
      HEADER_LIMITS.offsetYmm.max,
      DEFAULT_HEADER_CONFIG.offsetYmm
    ),
    align: isAlign(source.align) ? source.align : DEFAULT_HEADER_CONFIG.align,
    repeatOnAllPages: Boolean(source.repeatOnAllPages),
  };
}

export function computeHeaderRect(
  cfg: Pick<HeaderConfig, "cropHeight" | "widthPct" | "align" | "offsetXmm" | "offsetYmm">,
  imgW: number,
  imgH: number
): HeaderRect {
  const contentW = A4.w - 2 * MARGIN;
  const w = contentW * cfg.widthPct;
  const h = w * ((imgH * cfg.cropHeight) / imgW);
  const alignX =
    cfg.align === "left" ? 0 : cfg.align === "right" ? contentW - w : (contentW - w) / 2;
  const x = MARGIN + alignX + cfg.offsetXmm;
  const y = cfg.offsetYmm;
  return { x, y, w, h, bottom: y + h };
}

export function sanitizeLetterheadName(value: unknown): string {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Give this header a name.");
  if (name.length > 60) throw new Error("Header names must be 60 characters or fewer.");
  return name;
}
