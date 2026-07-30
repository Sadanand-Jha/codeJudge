import { Router } from "express";

import adminRoutes from "./admin/index.ts"
import userRoutes from "./user/index.ts"

const protectedRouter = Router();

protectedRouter.use("/admin", adminRoutes)
protectedRouter.use("/user", userRoutes)
export default protectedRouter;
