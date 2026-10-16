// Secure media controller. Serves AES-256-GCM encrypted images from a secure directory
// as application/octet-stream to prevent browser media inspection. Also serves the
// public brand logo (public/logo/logo.png) inside the same encrypted envelope.
import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SecureMediaService } from "../services/secureMedia.service.ts";

const secureMediaService = new SecureMediaService();

// --- Brand logo (GET /api/v1/brand/logo) --------------------------------------
// Source of truth: backend public/logo/logo.png. Drop a new file there and the
// site picks it up on the next request (cache keyed on mtime + size).
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const brandLogoFile = path.resolve(moduleDir, "../../public/logo/logo.png");

// Trim tolerance for the padding around the artwork. Tuned against logo.png's
// near-white background: 25 strips the margins without eating the glyphs.
const LOGO_TRIM_THRESHOLD = 25;

type LogoVariant = "full" | "mark";

const logoCache = new Map<string, Buffer>();

/**
 * Crop the speech-bubble mark (left icon) out of a wide, already-trimmed
 * wordmark banner. Splits at the first background gap whose start falls in the
 * first 45% of the image — i.e. the seam between mark and wordmark — then
 * re-trims the left slice. Used for square slots (collapsed sidebar rail,
 * favicon). Falls back to the full banner if no seam is found.
 */
async function autoCropIcon(logoPng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(logoPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Background ≈ top-left pixel. A column counts as background only when every
  // pixel in it is within tolerance (sum of |ΔRGB| ≈ 25 per channel).
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  const tolerance = 75;
  const isBgColumn = new Array<boolean>(width).fill(true);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * channels;
      const diff =
        Math.abs(data[i] - bgR) +
        Math.abs(data[i + 1] - bgG) +
        Math.abs(data[i + 2] - bgB);
      if (diff > tolerance) {
        isBgColumn[x] = false;
        break;
      }
    }
  }

  const regionStart = Math.floor(width * 0.15);
  const regionEnd = Math.floor(width * 0.45);
  const minGap = 12;
  let gapStart = -1;

  for (let x = 0; x < width; ) {
    if (!isBgColumn[x]) {
      x++;
      continue;
    }
    const runStart = x;
    while (x < width && isBgColumn[x]) x++;
    const runEnd = x; // exclusive
    if (runStart < regionStart || runStart >= regionEnd || runEnd - runStart < minGap) {
      continue;
    }
    let hasContentBefore = false;
    for (let i = 0; i < runStart && !hasContentBefore; i++) {
      if (!isBgColumn[i]) hasContentBefore = true;
    }
    let hasContentAfter = false;
    for (let i = runEnd; i < width && !hasContentAfter; i++) {
      if (!isBgColumn[i]) hasContentAfter = true;
    }
    if (hasContentBefore && hasContentAfter) {
      gapStart = runStart;
      break;
    }
  }

  if (gapStart <= 0) return logoPng;

  return sharp(logoPng)
    .extract({ left: 0, top: 0, width: gapStart, height })
    .trim({ threshold: LOGO_TRIM_THRESHOLD })
    .png()
    .toBuffer();
}

/** Read + process public/logo/logo.png for the requested variant (cached). */
async function buildBrandLogoPng(variant: LogoVariant): Promise<Buffer> {
  const stat = await fs.stat(brandLogoFile); // ENOENT -> 404 upstream
  const cacheKey = `${stat.mtimeMs}:${stat.size}:${variant}`;
  const cached = logoCache.get(cacheKey);
  if (cached) return cached;

  const source = await fs.readFile(brandLogoFile);
  const trimmed = await sharp(source)
    .trim({ threshold: LOGO_TRIM_THRESHOLD })
    .png()
    .toBuffer();
  const png = variant === "mark" ? await autoCropIcon(trimmed) : trimmed;

  if (logoCache.size > 8) logoCache.clear();
  logoCache.set(cacheKey, png);
  return png;
}

/**
 * GET /api/v1/secure-media/:imageName
 * Returns encrypted image data as base64 with non-image MIME type
 * 
 * Security features:
 * - Reads from secure directory (not public)
 * - AES-256-GCM encryption
 * - Returns as application/octet-stream to hide from browser's media inspection
 */
export const getSecureMedia = async (req: Request, res: Response) => {
  try {
    const { imageName } = req.params;

    if (!imageName) {
      res.status(400).json({
        success: false,
        message: "Image name is required",
      });
      return;
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedName = imageName.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!sanitizedName) {
      res.status(400).json({
        success: false,
        message: "Invalid image name",
      });
      return;
    }

    // Construct secure file path
    const secureDir = process.env.SECURE_MEDIA_DIR || './secure-media';
    const filePath = `${secureDir}/${sanitizedName}`;

    // Encrypt and return the image
    const encryptedBase64 = await secureMediaService.encryptImageFile(filePath);

    // Return with non-image MIME type to prevent browser from treating it as media
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}.enc"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    res.status(200).json({
      success: true,
      data: encryptedBase64,
      mimeType: 'application/octet-stream',
    });
  } catch (error) {
    console.error("Error fetching secure media:", error);
    
    if (error instanceof Error && error.message === 'Image file not found') {
      res.status(404).json({
        success: false,
        message: "Image not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while fetching secure media",
    });
  }
};

/**
 * GET /api/v1/brand/logo (PUBLIC — no auth, used by navbars/footers/auth pages)
 * Serves the site logo from public/logo/logo.png — whitespace-trimmed and
 * AES-256-GCM encrypted, same envelope as secure-media.
 * Query: ?variant=mark returns the icon-only crop for square slots
 * (collapsed sidebar rail, favicon generation).
 */
export const getBrandLogo = async (req: Request, res: Response) => {
  try {
    const variant: LogoVariant = req.query.variant === "mark" ? "mark" : "full";
    const png = await buildBrandLogoPng(variant);
    const encryptedBase64 = secureMediaService.encrypt(png).toString("base64");

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="logo-${variant}.png.enc"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Logo is static — allow short public caching (encrypted bytes are
    // useless without the AES key, rotated per deploy).
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.status(200).json({
      success: true,
      data: encryptedBase64,
      mimeType: 'application/octet-stream',
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({
        success: false,
        message: "Brand logo not found",
      });
      return;
    }
    console.error("Error fetching brand logo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching brand logo",
    });
  }
};