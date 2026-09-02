// Follow routes. Authenticated endpoints for searching users, listing followers/following,
// and follow/unfollow actions under /api/v1/user/follow.
import { Router } from "express";
import { authenticate } from "../../middleware/auth.ts";
import {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  searchUser,
} from "../../controllers/follow.controller.ts";

const router = Router();

router.use(authenticate);

router.get("/search", searchUser);
router.get("/followers", getFollowers);
router.get("/following", getFollowing);
router.post("/:userId", followUser);
router.delete("/:userId", unfollowUser);

export default router;
