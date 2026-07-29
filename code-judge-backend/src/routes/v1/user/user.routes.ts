import { Router } from "express";
import { forgetPassword, userRegister } from "../../../controllers/user.controller.ts";
import { validate, registerSchema } from "../../../middleware/validate.ts";

const router = Router();

// POST /api/v1/user/register
// Validation middleware runs BEFORE the controller:
//   1. validate(registerSchema) - sanitizes & validates input
//   2. userRegister - handles business logic with clean, safe data
router.post("/register", validate(registerSchema), userRegister);
router.post("/auth/forget-password", forgetPassword);

export default router;