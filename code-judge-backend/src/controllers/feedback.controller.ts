// Feedback controller. Signed-in users submit product feedback from the
// public contact page; the platform console reads everything from
// platform.controller.ts (owner-only).
import type { Request, Response } from "express";
import { pool } from "../config/database.ts";
import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  isFeedbackCategory,
} from "../constants/feedback.ts";

// POST /api/v1/user/feedback
export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const rawUserId = req.user?.userId;
    const userId = Number(rawUserId);
    if (!rawUserId || !Number.isInteger(userId)) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { category, message } = (req.body ?? {}) as {
      category?: unknown;
      message?: unknown;
    };

    if (!isFeedbackCategory(category)) {
      res.status(400).json({ success: false, message: "Choose a valid feedback category" });
      return;
    }

    const trimmed = typeof message === "string" ? message.trim() : "";
    if (trimmed.length < FEEDBACK_MESSAGE_MIN) {
      res.status(400).json({
        success: false,
        message: `Message must be at least ${FEEDBACK_MESSAGE_MIN} characters`,
      });
      return;
    }
    if (trimmed.length > FEEDBACK_MESSAGE_MAX) {
      res.status(400).json({
        success: false,
        message: `Message must be at most ${FEEDBACK_MESSAGE_MAX} characters`,
      });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO user_feedback (user_id, category, message)
       VALUES ($1, $2, $3)
       RETURNING id, category, message, created_at`,
      [userId, category, trimmed]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("submitFeedback error", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
