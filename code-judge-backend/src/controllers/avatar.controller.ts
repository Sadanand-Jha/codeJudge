import type { Request, Response } from "express";
import { pool } from "../app.ts";
import { isValidPredefinedAvatar } from "../constants/avatars.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AVATAR_DIR = path.resolve(__dirname, "../../public/avatars");

/**
 * PATCH /api/user/avatar
 * Updates the user's avatar URL
 *
 * Body: { "avatarUrl": "/images/avatar-1.png" }
 *
 * Validation:
 * - Accepts only one of the predefined 7 avatar URLs
 * - Rejects any other URL with 400 Bad Request
 * - Updates only the avatar_url column
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

    // Validate that the avatar URL is one of the predefined avatars
    if (!isValidPredefinedAvatar(avatarUrl)) {
      res.status(400).json({
        success: false,
        message: "Invalid avatar URL. Only predefined avatars are allowed.",
      });
      return;
    }

    // Update only the avatar column
    const query = `
      UPDATE users
      SET avatar = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING avatar
    `;

    const result = await pool.query(query, [avatarUrl, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const updatedAvatarUrl = result.rows[0].avatar;

    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      data: {
        avatarUrl: updatedAvatarUrl,
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