// Owner-only platform control-center routes. Mounted at /api/v1/platform.
// Every route uses requireOwner (server-side auth + admin/allowlist check).
import { Router } from "express";
import { requireOwner } from "../../middleware/requireOwner.ts";
import {
  getOverview, getSeries, getLive, getActivity, getUsers, getQuizzes,
  getAi, getHealth, getJobs, getErrors, getSecurity, getAudit,
  getStorage, getGrowth, search, getAlerts,
} from "../../controllers/platform.controller.ts";

const router = Router();

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

export default router;
