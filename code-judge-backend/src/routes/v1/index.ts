// V1 API namespace router. Mounts admin routes, user routes, and avatar/secure-media
// endpoints under /api/v1.
import { Router } from "express";

import adminRoutes from "./admin/index.ts"
import userRoutes from "./user/index.ts"
import { getAvatar } from "../../controllers/avatar.controller.ts";
import { getSecureMedia } from "../../controllers/secureMedia.controller.ts";

const protectedRouter = Router();

protectedRouter.use("/admin", adminRoutes)
protectedRouter.use("/user", userRoutes)
protectedRouter.get("/avatars/:id", getAvatar);
protectedRouter.get("/secure-media/:imageName", getSecureMedia);
export default protectedRouter;
