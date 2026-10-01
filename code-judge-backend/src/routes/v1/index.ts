// V1 API namespace router. Mounts admin routes, user routes, and avatar/secure-media
// endpoints under /api/v1.
import { Router } from "express";

import adminRoutes from "./admin/index.ts"
import userRoutes from "./user/index.ts"
import platformRoutes from "./platform.routes.ts"
import { getAvatar } from "../../controllers/avatar.controller.ts";
import { getSecureMedia } from "../../controllers/secureMedia.controller.ts";
import { authenticate } from "../../middleware/auth.ts";

const protectedRouter = Router();

// The platform console uses its own isolated owner session and performs its
// authorization inside platformRoutes. Keep it ahead of the regular-user
// guard so a valid platform_session is not mistaken for a session_token.
protectedRouter.use("/platform", platformRoutes)

// Everything else in /api/v1 is private. Individual sub-routers may keep
// their own role/feature guards, but no route can accidentally become public
// merely because a local authenticate middleware was omitted.
protectedRouter.use(authenticate);
protectedRouter.use("/admin", adminRoutes)
protectedRouter.use("/user", userRoutes)
protectedRouter.get("/avatars/:id", getAvatar);
protectedRouter.get("/secure-media/:imageName", getSecureMedia);
export default protectedRouter;
