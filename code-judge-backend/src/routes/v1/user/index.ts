import {Router} from "express";
import editorRoutes from "./editor.routes.ts";
import { validate, registerSchema } from "../../../middleware/validate.ts";
import { userRegister, forgetPassword, profile } from "../../../controllers/user.controller.ts";
import { authenticate } from "../../../middleware/auth.ts";

const router = Router();




router.use("/editor", editorRoutes);





router.post("/register", validate(registerSchema), userRegister);
router.post("/forget-password", forgetPassword);


router.get("/profile", authenticate, profile);
router.get("/info", authenticate, profile);

export default router;
