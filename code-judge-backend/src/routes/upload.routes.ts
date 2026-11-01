import { Router } from "express";
import { authenticate } from "../middleware/auth.ts";
import {
  avatarSignatureRateLimit,
  letterheadSignatureRateLimit,
} from "../middleware/letterheadRateLimit.ts";
import { validate, avatarUploadSignatureSchema } from "../middleware/validate.ts";
import { getLetterheadUploadSignature } from "../controllers/letterhead.controller.ts";
import { getAvatarUploadSignature } from "../controllers/avatar.controller.ts";

const router = Router();

router.post(
  "/cloudinary/signature",
  authenticate,
  letterheadSignatureRateLimit,
  getLetterheadUploadSignature
);

router.post(
  "/cloudinary/avatar-signature",
  authenticate,
  avatarSignatureRateLimit,
  validate(avatarUploadSignatureSchema),
  getAvatarUploadSignature
);

export default router;
