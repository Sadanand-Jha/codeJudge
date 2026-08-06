import {Router} from "express";
import editorRoutes from "./editor.routes.ts";
import contestRoutes from "./contest.routes.ts";
import quizRoutes from "./quiz.routes.ts";
import { validate, registerSchema } from "../../../middleware/validate.ts";
import { userRegister, forgetPassword, profile } from "../../../controllers/user.controller.ts";
import { authenticate } from "../../../middleware/auth.ts";
import { updateAvatar } from "../../../controllers/avatar.controller.ts";
import { getAllSubjects } from "../../../controllers/quiz.controller.ts";

const router = Router();




router.use("/editor", editorRoutes);
router.use("/contest", contestRoutes);
router.use("/quiz", quizRoutes);





router.post("/register", validate(registerSchema), userRegister);
router.post("/forget-password", forgetPassword);


router.get("/profile", authenticate, profile);
router.get("/info", authenticate, profile);
router.patch("/avatar", authenticate, updateAvatar);


// ===================== SUBJECTS ==========
router.get("/quiz-subjects", getAllSubjects)

export default router;
