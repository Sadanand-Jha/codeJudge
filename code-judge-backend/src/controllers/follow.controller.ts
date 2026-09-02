// Social follow controller. Handles follow/unfollow users, get followers/following lists,
// and search users for follow operations.
import type { Request, Response } from "express";
import { FollowRepository } from "../repositories/follow.repository.ts";

const followRepo = new FollowRepository();

// GET /api/v1/user/followers
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const followers = await followRepo.getFollowers(String(userId));
    res.status(200).json({ success: true, data: followers });
  } catch (e) {
    console.error("getFollowers error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/user/following
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const following = await followRepo.getFollowing(String(userId));
    res.status(200).json({ success: true, data: following });
  } catch (e) {
    console.error("getFollowing error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/v1/user/follow/:userId
export const followUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { userId: targetId } = req.params;
    if (!targetId) { res.status(400).json({ success: false, message: "Target user ID is required" }); return; }
    if (String(userId) === String(targetId)) {
      res.status(400).json({ success: false, message: "You cannot follow yourself" });
      return;
    }
    // Verify target user exists
    const target = await followRepo.findUserByUsername(targetId);
    if (!target && !/^\d+$/.test(targetId)) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const actualTargetId = /^\d+$/.test(targetId) ? targetId : target?.id;
    if (!actualTargetId) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const created = await followRepo.follow(String(userId), String(actualTargetId));
    const [followerCount, followingCount] = await Promise.all([
      followRepo.getFollowerCount(String(actualTargetId)),
      followRepo.getFollowingCount(String(userId)),
    ]);
    res.status(201).json({
      success: true,
      message: created ? "Followed" : "Already following",
      data: { followerCount, followingCount },
    });
  } catch (e) {
    console.error("followUser error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/v1/user/follow/:userId
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { userId: targetId } = req.params;
    if (!targetId) { res.status(400).json({ success: false, message: "Target user ID is required" }); return; }
    const unfollowed = await followRepo.unfollow(String(userId), targetId);
    if (!unfollowed) {
      res.status(404).json({ success: false, message: "Not following this user" });
      return;
    }
    const [followerCount, followingCount] = await Promise.all([
      followRepo.getFollowerCount(targetId),
      followRepo.getFollowingCount(String(userId)),
    ]);
    res.status(200).json({
      success: true,
      message: "Unfollowed",
      data: { followerCount, followingCount },
    });
  } catch (e) {
    console.error("unfollowUser error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/user/follow/search?username=xxx
export const searchUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const username = String(req.query.username ?? "").trim();
    if (!username) { res.status(400).json({ success: false, message: "username query is required" }); return; }
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(username)) {
      res.status(400).json({ success: false, message: "Invalid username format" }); return;
    }
    const user = await followRepo.findUserByUsername(username);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    // If requester is logged in, check if they already follow this user
    let isFollowing = false;
    if (userId) {
      isFollowing = await followRepo.isFollowing(String(userId), user.id);
    }
    res.status(200).json({ success: true, data: { ...user, isFollowing } });
  } catch (e) {
    console.error("searchUser error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
