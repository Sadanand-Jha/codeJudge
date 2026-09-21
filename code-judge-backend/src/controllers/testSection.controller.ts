/**
 * Test Section Generation Controller
 *
 * Handles PDF upload and returns AI-generated section structure.
 * All derived marks are computed server-side — the AI only provides
 * raw question counts and marks-per-question.
 */
import type { Request, Response } from "express";
import { generateSectionsFromPDF } from "../services/testSectionGeneration.service.js";

export const generateSections = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const file = (req.file as Express.Multer.File | undefined) ?? null;
    if (!file) {
      res.status(400).json({ success: false, message: "Please upload a valid PDF." });
      return;
    }

    if (file.mimetype !== "application/pdf") {
      res.status(400).json({ success: false, message: "Only PDF files are supported." });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      res.status(400).json({ success: false, message: "File size must be under 20MB." });
      return;
    }

    const result = await generateSectionsFromPDF(file.buffer, file.originalname);

    res.status(200).json({
      success: true,
      data: {
        sections: result.sections,
      },
    });
  } catch (error: any) {
    console.error("Section generation error:", error);
    const message = error?.message || "Failed to generate sections. Please try again.";

    if (message.includes("extract content") || message.includes("unavailable")) {
      res.status(500).json({ success: false, message });
    } else if (message.includes("couldn't be validated")) {
      res.status(422).json({ success: false, message });
    } else if (message.includes("No usable")) {
      res.status(400).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message });
    }
  }
};
