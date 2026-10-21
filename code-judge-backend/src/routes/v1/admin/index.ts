// Admin routes. Creator-facing APIs are mounted under /api/v1/admin.
import { Router } from "express";
import quizRoutes from "./quiz.routes.ts";
import savedTestPaperRoutes from "./savedTestPaper.routes.ts";
import testSectionRoutes from "./testSection.routes.ts";

const router = Router();

router.use("/quiz", quizRoutes);
router.use("/tests/saved-papers", savedTestPaperRoutes);
router.use("/tests", testSectionRoutes);

export default router;