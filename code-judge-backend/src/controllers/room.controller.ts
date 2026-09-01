import type { Request, Response } from "express";
import { RoomRepository } from "../repositories/room.repository.ts";

const roomRepo = new RoomRepository();

// POST /api/v1/user/rooms  { name, description }
export const createRoom = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { name, description } = req.body;
    if (!name || !String(name).trim()) { res.status(400).json({ success: false, message: "Room name is required" }); return; }
    // Enforce maximum rooms per creator (must match frontend MAX_ROOMS_PER_CREATOR)
    const MAX_ROOMS_PER_CREATOR = 5;
    const countResult = await roomRepo.countRoomsByOwner(String(userId));
    if (countResult >= MAX_ROOMS_PER_CREATOR) {
      res.status(403).json({ success: false, message: `You can create at most ${MAX_ROOMS_PER_CREATOR} rooms. Remove or archive a room to create a new one.` });
      return;
    }
    const room = await roomRepo.createRoom(String(userId), String(name).trim(), description ? String(description).trim() : undefined);
    res.status(201).json({ success: true, data: room });
  } catch (e) {
    console.error("createRoom error", e);
    res.status(500).json({ success: false, message: "Internal server error while creating room" });
  }
};

// GET /api/v1/user/rooms
export const listRooms = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const rooms = await roomRepo.getRoomsByOwner(String(userId));
    res.status(200).json({ success: true, data: rooms });
  } catch (e) {
    console.error("listRooms error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/user/rooms/:roomId
export const getRoom = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { roomId } = req.params;
    const room = await roomRepo.getRoomById(String(roomId), String(userId));
    if (!room) { res.status(404).json({ success: false, message: "Room not found" }); return; }
    const members = await roomRepo.getRoomMembers(String(roomId));
    res.status(200).json({ success: true, data: { ...room, members } });
  } catch (e) {
    console.error("getRoom error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/user/rooms/search/user?username=xxx
export const searchUser = async (req: Request, res: Response) => {
  try {
    const username = String(req.query.username ?? req.query.q ?? "").trim();
    if (!username) { res.status(400).json({ success: false, message: "username query is required" }); return; }
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(username)) {
      res.status(400).json({ success: false, message: "Invalid username format" }); return;
    }
    const user = await roomRepo.findUserByUsername(username);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    res.status(200).json({ success: true, data: user });
  } catch (e) {
    console.error("searchUser error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/user/rooms/search/users?q=xxx
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? req.query.username ?? "").trim();
    if (!q || q.length < 2) { res.status(200).json({ success: true, data: [] }); return; }
    const users = await roomRepo.searchUsers(q, 10);
    res.status(200).json({ success: true, data: users });
  } catch (e) {
    console.error("searchUsers error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/user/rooms/by-student/:username
export const getRoomsForStudent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const username = String(req.params.username ?? "").trim();
    if (!username) { res.status(400).json({ success: false, message: "username is required" }); return; }
    const rooms = await roomRepo.getRoomsForStudent(String(userId), username);
    res.status(200).json({ success: true, data: rooms });
  } catch (e) {
    console.error("getRoomsForStudent error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/v1/user/rooms/:roomId/members  { username }
export const addMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { roomId } = req.params;
    const { username } = req.body;
    if (!username || !String(username).trim()) { res.status(400).json({ success: false, message: "username is required" }); return; }
    const clean = String(username).trim();
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(clean)) {
      res.status(400).json({ success: false, message: "Invalid username format" }); return;
    }
    // Verify room ownership
    const room = await roomRepo.getRoomById(String(roomId), String(userId));
    if (!room) { res.status(404).json({ success: false, message: "Room not found or not owned by you" }); return; }
    const target = await roomRepo.findUserByUsername(clean);
    if (!target) { res.status(404).json({ success: false, message: "User not found" }); return; }
    const result = await roomRepo.addMember(String(roomId), String(target.id));
    if (result.alreadyExists) {
      res.status(409).json({ success: false, message: "User already in room", data: target });
      return;
    }
    res.status(201).json({ success: true, message: "Member added", data: { member: result.member, user: target } });
  } catch (e) {
    console.error("addMember error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/v1/user/rooms/:roomId/members/:userId
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { roomId, userId: targetUserId } = req.params;
    const room = await roomRepo.getRoomById(String(roomId), String(userId));
    if (!room) { res.status(404).json({ success: false, message: "Room not found" }); return; }
    const deleted = await roomRepo.removeMember(String(roomId), String(targetUserId));
    if (!deleted) { res.status(404).json({ success: false, message: "Member not found in room" }); return; }
    res.status(200).json({ success: true, message: "Member removed" });
  } catch (e) {
    console.error("removeMember error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PATCH /api/v1/user/rooms/:roomId/members/:userId  { active: boolean }
export const updateMemberStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { roomId, userId: targetUserId } = req.params;
    const { active } = req.body;
    if (typeof active !== "boolean") { res.status(400).json({ success: false, message: "active boolean is required" }); return; }
    const room = await roomRepo.getRoomById(String(roomId), String(userId));
    if (!room) { res.status(404).json({ success: false, message: "Room not found" }); return; }
    const updated = await roomRepo.updateMemberStatus(String(roomId), String(targetUserId), active);
    if (!updated) { res.status(404).json({ success: false, message: "Member not found" }); return; }
    res.status(200).json({ success: true, data: updated });
  } catch (e) {
    console.error("updateMemberStatus error", e);
    const msg = (e as Error).message === "ROOM_NOT_FOUND" ? "Room not found" : "Internal server error";
    res.status(500).json({ success: false, message: msg });
  }
};

// PATCH /api/v1/user/rooms/:roomId  { name?, description?, archived? }
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
    const { roomId } = req.params;
    const { name, description, archived } = req.body;
    const patch: { name?: string; description?: string; isActive?: boolean } = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (description !== undefined) patch.description = String(description).trim();
    if (archived !== undefined) patch.isActive = !Boolean(archived);
    const room = await roomRepo.updateRoom(String(roomId), String(userId), patch);
    if (!room) { res.status(404).json({ success: false, message: "Room not found" }); return; }
    res.status(200).json({ success: true, data: room });
  } catch (e) {
    console.error("updateRoom error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
