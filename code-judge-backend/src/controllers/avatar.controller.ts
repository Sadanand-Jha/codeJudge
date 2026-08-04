import type { Request, Response } from "express";
import { pool } from "../app.ts";
import { isValidPredefinedAvatar, PREDEFINED_AVATARS } from "../constants/avatars.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AVATAR_DIR = path.resolve(__dirname, "../../public/avatars");

/**
 * Validate avatar URL to allow:
 * - Predefined avatars (e.g., "/api/v1/avatars/1", "/images/avatar-1.png")
 * - Custom backend images (e.g., "/images/custom-profile.jpg", "/uploads/avatar.png")
 */
function isValidAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  // Allow predefined avatars
  if (isValidPredefinedAvatar(url)) return true;

  // Allow local backend images: /images/*, /api/v1/avatars/*, /uploads/*
  const allowedPatterns = [
    /^\/images\/[a-zA-Z0-9\-_\/\.]+$/,           // /images/filename.png
    /^\/api\/v1\/avatars\/[0-9]+$/,              // /api/v1/avatars/1-21
    /^\/uploads\/[a-zA-Z0-9\-_\/\.]+$/,          // /uploads/filename.png
  ];

  return allowedPatterns.some(pattern => pattern.test(url));
}

/**
 * PATCH /api/user/avatar
 * Updates the user's avatar URL
 *
 * Body: { "avatarUrl": "/images/avatar-1.png" }
 *
 * Validation:
 * - Accepts predefined avatar URLs (e.g., "/api/v1/avatars/1", "/images/avatar-1.png")
 * - Accepts custom backend image paths (e.g., "/images/custom-avatar.jpg", "/uploads/avatar.png")
 * - Rejects invalid URLs with 400 Bad Request
 * - Updates the avatar_id foreign key in users table
 */
export const updateAvatar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { avatarUrl } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    // Validate that the avatar URL is one of the predefined avatars or a custom backend image
    if (!isValidAvatarUrl(avatarUrl)) {
      res.status(400).json({
        success: false,
        message: "Invalid avatar URL. Only predefined avatars or backend image paths are allowed.",
      });
      return;
    }

    let avatarId: number;

    // Check if it's a predefined avatar (e.g., "/api/v1/avatars/1")
    const predefinedMatch = avatarUrl.match(/^\/api\/v1\/avatars\/(\d+)$/);
    if (predefinedMatch) {
      avatarId = parseInt(predefinedMatch[1]);
    } else {
      // For custom backend images, insert or get existing avatar record
      // This follows the same pattern as init.sql: INSERT ... ON CONFLICT (url) DO NOTHING
      const insertQuery = `
        INSERT INTO avatar (is_male, url, created_at, updated_at)
        VALUES (true, $1, NOW(), NOW())
        ON CONFLICT (url) DO NOTHING
        RETURNING id
      `;
      
      const insertResult = await pool.query(insertQuery, [avatarUrl]);
      
      // If not inserted (already exists), get the existing ID
      if (insertResult.rows.length === 0) {
        const selectQuery = `SELECT id FROM avatar WHERE url = $1`;
        const selectResult = await pool.query(selectQuery, [avatarUrl]);
        avatarId = selectResult.rows[0]?.id;
      } else {
        avatarId = insertResult.rows[0].id;
      }
    }

    // Update user's avatar_id
    const updateQuery = `
      UPDATE users
      SET avatar_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING avatar_id
    `;
    
    const result = await pool.query(updateQuery, [avatarId, userId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      data: {
        avatarUrl: avatarUrl,
        avatarId: avatarId,
      },
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating avatar",
    });
  }
};

/**
 * GET /api/v1/avatars/:id
 * Serves an individual avatar image (1-7) from the sliced avatar directory.
 */
export const getAvatar = (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  // Validate ID is between 1 and 7
  if (isNaN(id) || id < 1 || id > 7) {
    res.status(400).json({
      success: false,
      message: "Invalid avatar ID. Must be between 1 and 7.",
    });
    return;
  }

  const filePath = path.join(AVATAR_DIR, `${id}.png`);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({
      success: false,
      message: "Avatar not found.",
    });
    return;
  }

  // Serve the image with proper caching headers
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  res.setHeader("Content-Type", "image/png");
  res.sendFile(filePath);
};