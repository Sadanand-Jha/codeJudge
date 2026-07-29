import {Router} from "express";
import editorRoutes from "./editor.routes.ts";
import userRoutes from "./user.routes.ts";

const router = Router();

router.use("/editor", editorRoutes);
router.use("/", userRoutes);

export default router;