import Router from "express";
import editorRoutes from "./editor.routes.ts";

const router = Router();

router.use("/editor", editorRoutes);

export default router;