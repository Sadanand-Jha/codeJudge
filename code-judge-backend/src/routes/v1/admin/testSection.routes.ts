// Admin test section generation routes.
// POST /api/v1/admin/tests/generate-sections
import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.ts";
import { generateSections } from "../../../controllers/testSection.controller.ts";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 1,
  },
});

const router = Router();

router.use(authenticate);

router.post(
  "/generate-sections",
  upload.single("file"),
  generateSections
);

export default router;
