// User sub-router. Aggregates editor, contest, quiz, AI, room, and follow sub-routes,
// plus user registration, profile, password, timezone, avatar, and info endpoints.
import {Router} from "express";
import editorRoutes from "./editor.routes.ts";
import contestRoutes from "./contest.routes.ts";
import quizRoutes from "./quiz.routes.ts";
import { validate, registerSchema } from "../../../middleware/validate.ts";
import { userRegister, forgetPassword, profile, lookupUser } from "../../../controllers/user.controller.ts";
import { getTimezones } from "../../../controllers/timezone.controller.ts";
import { authenticate } from "../../../middleware/auth.ts";
import { updateAvatar } from "../../../controllers/avatar.controller.ts";
import { getAllSubjects, getAllExamCategories } from "../../../controllers/quiz.controller.ts";
import {
  getCountries,
  getStatesByCountry,
  getCollegesByState,
  updateUserLocation,
} from "../../../controllers/profile.controller.ts";
import aiRoutes from "./ai.routes.ts";
import roomRoutes from "../room.routes.ts";
import followRoutes from "../follow.routes.ts";
import { listRooms } from "../../../controllers/room.controller.ts";


const router = Router();




router.use("/editor", editorRoutes);
router.use("/contest", contestRoutes);
router.use("/quiz", quizRoutes);
router.use("/ai", aiRoutes);
router.use("/rooms", roomRoutes);
router.use("/follow", followRoutes);




router.post("/register", validate(registerSchema), userRegister);
router.post("/forget-password", forgetPassword);


router.get("/profile", authenticate, profile);
router.get("/info", authenticate, profile);

// ===================== PROFILE LOCATION ==========
router.get("/profile/countries", authenticate, getCountries);
router.get("/profile/states", authenticate, getStatesByCountry);
router.get("/profile/colleges", authenticate, getCollegesByState);
router.patch("/profile/location", authenticate, updateUserLocation);

router.patch("/avatar", authenticate, updateAvatar);



// ===================== SUBJECTS ==========
router.get("/quiz-subjects", getAllSubjects)
router.get("/quiz-exam-categories", getAllExamCategories)

// ===================== TIMEZONES ==========
router.get("/timezones", authenticate, getTimezones);

// ===================== USER LOOKUP (for collaborators) ==========
router.get("/users/:userId", authenticate, lookupUser);

// ===================== ROOMS MY-ROOMS ALIAS (frontend expects /my-rooms) ==========
router.get("/my-rooms", authenticate, listRooms);



export default router;
