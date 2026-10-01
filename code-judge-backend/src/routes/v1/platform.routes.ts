// Owner-only platform control-center routes. Mounted at /api/v1/platform.
// Every route uses requireOwner (server-side auth + admin/allowlist check).
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { requireOwner } from "../../middleware/requireOwner.ts";
import {
  getOverview, getSeries, getLive, getActivity, getUsers, getQuizzes,
  getAi, getHealth, getJobs, getErrors, getSecurity, getAudit,
  getStorage, getGrowth, search, getAlerts,
  getObservability, getRequestDetail,
} from "../../controllers/platform.controller.ts";
import {
  commitQuestionImport,
  getQuestionImportCatalog,
  previewQuestionImport,
} from "../../controllers/platformQuestionImport.controller.ts";

const router = Router();
const questionDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 4 * 1024 * 1024 },
});
const uploadQuestionDocument = (req: Request, res: Response, next: NextFunction) => {
  questionDocumentUpload.single("file")(req, res, (error) => {
    if (!error) return next();
    const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
      ? "Document must be 4 MB or smaller."
      : "Unable to accept this document upload.";
    return res.status(400).json({ success: false, message });
  });
};

router.use(requireOwner);

// Lightweight authenticated-owner probe used by the client gate. Keeping
// this separate from dashboard queries avoids loading analytics simply to
// establish whether the current session is authorized.
router.get("/session", (_req, res) => {
  res.status(200).json({ success: true, data: { authorized: true } });
});

router.get("/overview", getOverview);
router.get("/series", getSeries);
router.get("/live", getLive);
router.get("/activity", getActivity);
router.get("/users", getUsers);
router.get("/quizzes", getQuizzes);
router.get("/ai", getAi);
router.get("/health", getHealth);
router.get("/jobs", getJobs);
router.get("/errors", getErrors);
router.get("/security", getSecurity);
router.get("/audit", getAudit);
router.get("/storage", getStorage);
router.get("/growth", getGrowth);
router.get("/search", search);
router.get("/alerts", getAlerts);
router.get("/observability", getObservability);
router.get("/requests/:requestId", getRequestDetail);
router.get("/question-import/catalog", getQuestionImportCatalog);
router.post("/question-import/preview", uploadQuestionDocument, previewQuestionImport);
router.post("/question-import/commit", commitQuestionImport);

export default router;
