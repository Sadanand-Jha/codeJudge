import path from "node:path";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.ts";
import { requireAiCredits } from "../../../middleware/requireAiCredits.ts";
import { requireActiveAiUser } from "../../../middleware/requireActiveAiUser.ts";
import { requirePaidPlan } from "../../../middleware/requirePaidPlan.ts";
import {
  createCustomSyllabus,
  deleteCustomSyllabus,
  getCustomSyllabus,
  getCustomSyllabusImportJob,
  getSyllabusImportCost,
  listCustomSyllabi,
  renameCustomSyllabus,
  searchCustomSyllabus,
  startCustomSyllabusImport,
  streamCustomSyllabusImport,
  updateCustomSyllabus,
} from "../../../controllers/customSyllabus.controller.ts";
import { getSyllabusImportConfig } from "../../../services/syllabusBreakdown.service.ts";
import { SyllabusServiceError } from "../../../services/syllabusSchema.ts";

const router = Router();
const importConfig = getSyllabusImportConfig();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: importConfig.maxBytes,
    files: 1,
    fields: 2,
    parts: 3,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!importConfig.allowedExtensions.includes(extension)) {
      callback(
        new SyllabusServiceError(
          400,
          "Supported files: PDF, DOCX, and TXT.",
          "UNSUPPORTED_FILE_TYPE"
        )
      );
      return;
    }
    callback(null, true);
  },
});

const uploadSyllabus = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `The file must be under ${Math.round(importConfig.maxBytes / (1024 * 1024))} MB.`
          : "Upload rejected. Attach one PDF, DOCX, or TXT file.";
      res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        success: false,
        code: error.code,
        message,
      });
      return;
    }
    if (error instanceof SyllabusServiceError) {
      res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
      });
      return;
    }
    console.error("[custom-syllabus] upload failed:", error);
    res.status(400).json({
      success: false,
      message: "The file could not be processed. Attach a PDF, DOCX, or TXT file.",
    });
  });
};

router.use(authenticate);

router.get("/search", searchCustomSyllabus);
router.get("/import/cost", getSyllabusImportCost);
router.post(
  "/import",
  requirePaidPlan,
  requireActiveAiUser,
  requireAiCredits,
  uploadSyllabus,
  startCustomSyllabusImport
);
router.get("/import/:jobId/stream", streamCustomSyllabusImport);
router.get("/import/:jobId", getCustomSyllabusImportJob);

router.get("/", listCustomSyllabi);
router.post("/", createCustomSyllabus);
router.get("/:id", getCustomSyllabus);
router.put("/:id", updateCustomSyllabus);
router.patch("/:id/rename", renameCustomSyllabus);
router.delete("/:id", deleteCustomSyllabus);

export default router;
