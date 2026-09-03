// Admin routes. Creator-facing APIs are mounted under /api/v1/admin.
import { Router } from "express";
import quizRoutes from "./quiz.routes.ts";

const router = Router();

router.use("/quiz", quizRoutes);

export default router;