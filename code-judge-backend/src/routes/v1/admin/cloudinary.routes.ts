import {Router} from "express";
import { authenticate } from "../../../middleware/auth.ts";
import { cloudinarySignature } from "../../../controllers/cloudinary.ts";

const router = Router();
router.use(authenticate);

router.get("/signature", cloudinarySignature);


export default router;