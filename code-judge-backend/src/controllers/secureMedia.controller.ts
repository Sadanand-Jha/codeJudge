// Secure media controller. Serves AES-256-GCM encrypted images from a secure directory
// as application/octet-stream to prevent browser media inspection. Also serves the
// public brand logos (public/logo/*.png) inside the same encrypted envelope.
import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SecureMediaService } from "../services/secureMedia.service.ts";

const secureMediaService = new SecureMediaService();

// --- Brand logo (GET /api/v1/brand/logo) --------------------------------------
// Source of truth: two files in public/logo/ —
//   logo_with_name.png — speech-bubble mark + "QuizSupport" wordmark (wide, ~4:1)
//   logo.png           — icon-only mark (square, ~1:1)
// variant=full serves the first, variant=mark the second. Drop a new file there
// and the site picks it up on the next request (cache keyed on mtime + size).
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const logoDir = path.resolve(moduleDir, "../../public/logo");

type LogoVariant = "full" | "mark";

const brandLogoFiles: Record<LogoVariant, string> = {
  full: path.join(logoDir, "logo_with_name.png"),
  mark: path.join(logoDir, "logo.png"),
};

// Trim tolerance for the padding around the artwork. The source PNGs ship on a
// transparent canvas; 25 strips the margins without eating the glyphs.
const LOGO_TRIM_THRESHOLD = 25;

const logoCache = new Map<string, Buffer>();

async function statOrNull(file: string): Promise<{ mtimeMs: number; size: number } | null> {
  try {
    return await fs.stat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Read + process the variant's source file from public/logo/ (cached). */
async function buildBrandLogoPng(variant: LogoVariant): Promise<Buffer> {
  // If the with-name artwork is missing, degrade to the mark rather than 404.
  const preferred = brandLogoFiles[variant];
  let file = preferred;
  let stat = await statOrNull(file);
  if (!stat && variant === "full") {
    file = brandLogoFiles.mark;
    stat = await statOrNull(file);
  }
  if (!stat) {
    // Preserve ENOENT semantics so the route answers 404 (not 500).
    await fs.stat(preferred); // throws ENOENT for the preferred file
    throw Object.assign(new Error("Brand logo not found"), { code: "ENOENT" });
  }

  const cacheKey = `${file}:${stat.mtimeMs}:${stat.size}`;
  const cached = logoCache.get(cacheKey);
  if (cached) return cached;

  const source = await fs.readFile(file);
  const png = await sharp(source)
    .trim({ threshold: LOGO_TRIM_THRESHOLD })
    .png()
    .toBuffer();

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
 * Serves the site logo from public/logo/ — whitespace-trimmed and AES-256-GCM
 * encrypted, same envelope as secure-media.
 * Query: ?variant=full (default) serves logo_with_name.png (mark + wordmark),
 * ?variant=mark serves logo.png (icon-only) for square slots (collapsed
 * sidebar rail, auth headers, favicon generation).
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