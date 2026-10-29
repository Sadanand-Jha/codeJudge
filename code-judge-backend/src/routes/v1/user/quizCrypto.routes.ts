// Teacher key-encryption-key (KEK) setup. The passphrase itself never leaves
// the browser; only the salt, KDF parameters and a small check envelope are
// stored so another tab can verify an unlock attempt.
import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import {
  quizKekConfigSchema,
  validate,
} from "../../../middleware/validate.ts";
import {
  getKekConfigController,
  saveKekConfigController,
} from "../../../controllers/quizCrypto.controller.ts";

const router = Router();

router.use(authenticate);

router.get("/kek", getKekConfigController);
router.put("/kek", validate(quizKekConfigSchema), saveKekConfigController);

export default router;
