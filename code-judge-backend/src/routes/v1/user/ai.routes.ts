import { Router } from "express";
import multer from "multer";
import {
  chat,
  chatWithFiles,
  generateQuestionsFromUpload,
} from "../../../controllers/ai.controller.ts";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 25 },
});

router.post("/chat", chat);
router.post("/chat-files", upload.array("files", 25), chatWithFiles);
router.post("/generate-questions", upload.array("files", 25), generateQuestionsFromUpload);

export default router;