// Admin test section generation routes.
// POST /api/v1/admin/tests/generate-sections
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.ts";
import { requireActiveAiUser } from "../../../middleware/requireActiveAiUser.ts";
import { generateSections, generatePaper, downloadPaper, generateQuestions } from "../../../controllers/testSection.controller.ts";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 5,
    fields: 0,
    parts: 6,
  },
});

const router = Router();

router.use(authenticate, requireActiveAiUser);

const safeSingleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.array("files", 5)(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Each file must be under 2MB, and all selected files together must be 2MB or less."
        : "Upload rejected by file safety limits.";
      res.status(400).json({ success: false, message });
      return;
    }
    res.status(400).json({ success: false, message: "Upload could not be processed safely." });
  });
};

router.post(
  "/generate-sections",
  safeSingleUpload,
  generateSections
);

// Question paper from created sections + curated subjective bank (JSON body).
router.post("/generate-paper", generatePaper);

// Printable HTML download of a generated paper (JSON body: { paper }).
router.post("/paper-download", downloadPaper);

// Teacher question picker: N subjective questions, hardness split + topic (JSON body).
router.post("/generate-questions", generateQuestions);

export default router;
