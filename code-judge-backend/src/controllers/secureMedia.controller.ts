// Secure media controller. Serves AES-256-GCM encrypted images from a secure directory
// as application/octet-stream to prevent browser media inspection.
import type { Request, Response } from "express";
import { SecureMediaService } from "../services/secureMedia.service.ts";

const secureMediaService = new SecureMediaService();

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
 * Serves the site logo.png AES-256-GCM encrypted, same format as secure-media.
 */
export const getBrandLogo = async (_req: Request, res: Response) => {
  try {
    const secureDir = process.env.SECURE_MEDIA_DIR || './secure-media';
    const filePath = `${secureDir}/logo.png`;

    const encryptedBase64 = await secureMediaService.encryptImageFile(filePath);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="logo.png.enc"');
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
    console.error("Error fetching brand logo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching brand logo",
    });
  }
};