import { DEFAULT_HEADER_CONFIG, HEADER_LIMITS } from "@/config/letterheads";
import type {
  HeaderAlign,
  HeaderConfig,
  HeaderPlacement,
  HeaderRect,
  LetterheadCloudinaryAsset,
} from "@/types/letterhead";

export const A4 = { w: 210, h: 297 }; // mm
export const MARGIN = 15; // mm
export const HEADER_CONTENT_GAP_MM = 8;
export const MAX_HEADER_HEIGHT_MM = A4.h * 0.4;

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const isAlign = (value: unknown): value is HeaderAlign =>
  value === "left" || value === "center" || value === "right";

function computeMaxCropHeight(imageWidth: number, imageHeight: number, widthPct: number): number {
  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    return HEADER_LIMITS.cropHeight.max;
  }
  const contentWidth = A4.w - 2 * MARGIN;
  const widthMm = contentWidth * widthPct;
  const heightAtFullCrop = widthMm * (imageHeight / imageWidth);
  if (heightAtFullCrop <= MAX_HEADER_HEIGHT_MM) return HEADER_LIMITS.cropHeight.max;
  return Math.max(
    HEADER_LIMITS.cropHeight.min,
    Math.min(HEADER_LIMITS.cropHeight.max, MAX_HEADER_HEIGHT_MM / heightAtFullCrop)
  );
}

/**
 * Normalise a header config coming from the UI or an API request. Values are
 * clamped, and tall portraits are cropped further so questions always have
 * room below the header.
 */
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
  const maxCrop = computeMaxCropHeight(
    Number(imageWidth ?? 0),
    Number(imageHeight ?? 0),
    widthPct
  );
  const cropHeight = clamp(
    source.cropHeight,
    HEADER_LIMITS.cropHeight.min,
    Math.min(HEADER_LIMITS.cropHeight.max, maxCrop),
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

/**
 * Shared A4 coordinate model used by the live preview and both PDF renderers.
 * Coordinates are millimetres from the top-left edge of the page.
 */
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

export const mmToXPercent = (mm: number): number => (mm / A4.w) * 100;
export const mmToYPercent = (mm: number): number => (mm / A4.h) * 100;

export interface CropHeaderOptions {
  url: string;
  config: HeaderConfig;
  imageWidth?: number;
  imageHeight?: number;
  maxOutputWidth?: number;
}

export interface CroppedHeader {
  dataUrl: string;
  width: number;
  height: number;
  rect: HeaderRect;
}

function loadCrossOriginImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the header image."));
    image.src = url;
  });
}

/** Crop the visible header strip through a canvas (pdf-lib cannot crop). */
export async function cropHeaderImage({
  url,
  config,
  imageWidth,
  imageHeight,
  maxOutputWidth = 1600,
}: CropHeaderOptions): Promise<CroppedHeader> {
  if (typeof document === "undefined") {
    throw new Error("Header images can only be cropped in the browser.");
  }
  const image = await loadCrossOriginImage(url);
  const sourceWidth = Math.max(1, Math.round(imageWidth || image.naturalWidth || image.width));
  const sourceHeight = Math.max(1, Math.round(imageHeight || image.naturalHeight || image.height));
  const normalized = normalizeHeaderConfig(config, sourceWidth, sourceHeight);
  const rect = computeHeaderRect(normalized, sourceWidth, sourceHeight);
  const sourceY = Math.round(sourceHeight * normalized.cropTop);
  const sourceH = Math.max(1, Math.round(sourceHeight * normalized.cropHeight));
  const outputWidth = Math.max(1, Math.min(maxOutputWidth, sourceWidth));
  const outputHeight = Math.max(1, Math.round(outputWidth * (sourceH / sourceWidth)));

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the header image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(
    image,
    0,
    sourceY,
    sourceWidth,
    sourceH,
    0,
    0,
    outputWidth,
    outputHeight
  );

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    throw new Error("The header image could not be processed. Please upload it again.");
  }
  return { dataUrl, width: sourceWidth, height: sourceHeight, rect };
}

export async function prepareHeaderPlacement(
  asset: Pick<LetterheadCloudinaryAsset, "pngUrl" | "width" | "height">,
  config: HeaderConfig
): Promise<HeaderPlacement> {
  const cropped = await cropHeaderImage({
    url: asset.pngUrl,
    config,
    imageWidth: asset.width,
    imageHeight: asset.height,
  });
  return {
    dataUrl: cropped.dataUrl,
    rect: cropped.rect,
    repeatOnAllPages: config.repeatOnAllPages,
    gapMm: HEADER_CONTENT_GAP_MM,
  };
}

export function buildCloudinaryPreviewUrl(cloudName: string, publicId: string): string {
  const path = publicId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_png,w_1600,c_limit,pg_1/${path}`;
}
