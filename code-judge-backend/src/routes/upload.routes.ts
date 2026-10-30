import { Router } from "express";
import { authenticate } from "../middleware/auth.ts";
import { letterheadSignatureRateLimit } from "../middleware/letterheadRateLimit.ts";
import { getLetterheadUploadSignature } from "../controllers/letterhead.controller.ts";

const router = Router();

router.post(
  "/cloudinary/signature",
  authenticate,
  letterheadSignatureRateLimit,
  getLetterheadUploadSignature
);

export default router;
