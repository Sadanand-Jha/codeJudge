// Creator Studio document exports. Every export is authenticated and rebuilds
// the protected QuizSupport footer from the server-owned branding definition.
import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import { validate, documentExportSchema } from "../../../middleware/validate.ts";
import { exportDocumentController } from "../../../controllers/documentExport.controller.ts";
import { pdfDownloadCooldown } from "../../../middleware/pdfDownloadCooldown.ts";

const router = Router();

router.use(authenticate);
router.post("/export", validate(documentExportSchema), pdfDownloadCooldown, exportDocumentController);

export default router;
