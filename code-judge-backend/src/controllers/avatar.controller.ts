import type { Request, Response } from "express";
import { pool } from "../app.ts";
import { PREDEFINED_AVATARS, isValidPredefinedAvatar } from "../constants/avatars.ts";

/**
 * PATCH /api/user/avatar
 * Updates the user's avatar URL
 * 
 * Body: { "avatarUrl": "https://api.dicebear.com/9.x/adventurer/svg?seed=Alex" }
 * 
 * Validation:
 * - Accepts only one of the predefined 20 avatar URLs
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