// Creator-generated question papers saved in the account.
// Listing/downloading saved papers is available to any authenticated user;
// AI generation itself remains guarded by the test-section routes.
import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import {
  getSavedTest,
  getSavedTests,
  removeSavedTest,
  saveTest,
  updateSavedTest,
} from "../../../controllers/savedTestPaper.controller.ts";

const router = Router();

router.use(authenticate);

router.get("/", getSavedTests);
router.post("/", saveTest);
router.get("/:paperId", getSavedTest);
router.patch("/:paperId", updateSavedTest);
router.delete("/:paperId", removeSavedTest);

export default router;
