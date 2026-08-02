import { Router } from "express";

import adminRoutes from "./admin/index.ts"
import userRoutes from "./user/index.ts"
import { getAvatar } from "../../controllers/avatar.controller.ts";

const protectedRouter = Router();

protectedRouter.use("/admin", adminRoutes)
protectedRouter.use("/user", userRoutes)
protectedRouter.get("/avatars/:id", getAvatar);
export default protectedRouter;
