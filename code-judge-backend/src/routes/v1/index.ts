import { Router } from "express";

import adminRoutes from "./admin/index.ts"
import userRoutes from "./user/index.ts"

const router = Router();


router.use("/admin", adminRoutes)
router.use("/user", userRoutes)
export default router;
