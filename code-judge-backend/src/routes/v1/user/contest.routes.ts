// Contest routes. Authenticated endpoints for listing, viewing, and registering
// for coding contests under /api/v1/user/contest.
import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import {
  getAllContests,
  getContestById,
  getContestProblems,
  registerForContest,
  getMyContests,
} from "../../../controllers/contest.controller.ts";

const router = Router();

// All contest routes require authentication
router.use(authenticate);

// GET /api/v1/user/contest — get all contests
router.get("/", getAllContests);

// GET /api/v1/user/contest/my — get user's contest registrations
router.get("/my", getMyContests);

// GET /api/v1/user/contest/:contestId — get a single contest
router.get("/:contestId", getContestById);

// GET /api/v1/user/contest/:contestId/problems — get contest problems
router.get("/:contestId/problems", getContestProblems);

// POST /api/v1/user/contest/register — register for a contest
router.post("/register", registerForContest);

export default router;