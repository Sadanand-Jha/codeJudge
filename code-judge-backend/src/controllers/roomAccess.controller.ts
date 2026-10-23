// Public room access controller — create-with-credentials, rotate password,
// join-by-code, and the member-visible room summary.
import type { Request, Response } from "express";
import { RoomRepository } from "../repositories/room.repository.ts";
import {
  ROOM_JOIN_ERROR,
  ROOM_PASSWORD_EXPIRED_ERROR,
  computePasswordExpiresAt,
  hashRoomPassword,
  insertRoomWithUniqueCode,
  joinRoomWithPassword,
  previewRoomJoinWithPassword,
  roomPasswordExpiresAtIso,
} from "../services/roomAccess.service.ts";
import { normalizeRoomRegistrationForm } from "../services/roomRegistration.service.ts";
import {
  generateRoomPassword,
  isValidRoomCodeInput,
  normalizeRoomCode,
} from "../utils/roomCode.ts";

const roomRepo = new RoomRepository();

// Must match MAX_ROOMS_PER_CREATOR in the frontend.
const MAX_ROOMS_PER_CREATOR = 5;

function passwordExpiryFromBody(body: Record<string, unknown>): Date | null {
  return computePasswordExpiresAt(body.expires_in_minutes as number | null | undefined);
}

// POST /api/rooms  { name, password? }  (teacher only)
export const createRoomWithCredentials = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const name = String(req.body.name ?? "").trim();
    if (!name) {
      res.status(400).json({ success: false, message: "Room name is required", statusCode: 400 });
      return;
    }

    const roomCount = await roomRepo.countRoomsByOwner(String(userId));
    if (roomCount >= MAX_ROOMS_PER_CREATOR) {
      res.status(403).json({
        success: false,
        message: `You can create at most ${MAX_ROOMS_PER_CREATOR} rooms. Remove or archive a room to create a new one.`,
        statusCode: 403,
      });
      return;
    }

    const suppliedPassword = req.body.password as string | undefined;
    // The plaintext only exists in this response. Only the hash is persisted.
    const password = suppliedPassword ? suppliedPassword : generateRoomPassword();
    const passwordHash = await hashRoomPassword(password);
    const passwordExpiresAt = passwordExpiryFromBody(req.body);

    const { room } = await insertRoomWithUniqueCode({
      codeExists: (code) => roomRepo.roomCodeExists(code),
      insertRoom: (code) =>
        roomRepo.insertRoom({
          ownerId: String(userId),
          name,
          roomCode: code,
          passwordHash,
          passwordExpiresAt,
        }),
    });

    res.status(201).json({
      success: true,
      data: {
        id: String(room.id),
        name: room.name,
        room_code: room.room_code,
        password,
        password_expires_at: passwordExpiresAt ? passwordExpiresAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error("createRoomWithCredentials error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating room",
      statusCode: 500,
    });
  }
};

// POST /api/rooms/:code/reset-password  (teacher who owns the room)
export const resetRoomPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const roomCode = normalizeRoomCode(req.params.code);
    if (!isValidRoomCodeInput(roomCode)) {
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    const password = generateRoomPassword();
    const passwordHash = await hashRoomPassword(password);
    const passwordExpiresAt = passwordExpiryFromBody(req.body);
    const room = await roomRepo.updateRoomPassword(
      roomCode,
      String(userId),
      passwordHash,
      passwordExpiresAt
    );

    if (!room) {
      // Deliberately identical for "does not exist" and "not yours".
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: String(room.id),
        name: room.name,
        room_code: room.room_code,
        password,
        password_expires_at: passwordExpiresAt ? passwordExpiresAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error("resetRoomPassword error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while resetting password",
      statusCode: 500,
    });
  }
};

// POST /api/rooms/join/form  { room_code, password }  (authenticated)
// Verifies the credentials and returns the creator's registration form without
// creating a membership. Rate-limited like a join attempt.
export const previewRoomJoin = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const result = await previewRoomJoinWithPassword(
      { findRoomByCode: (code) => roomRepo.findRoomByCode(code) },
      {
        roomCode: String(req.body.room_code ?? ""),
        password: String(req.body.password ?? ""),
      }
    );

    if (!result.ok) {
      res.status(401).json({
        success: false,
        code: result.reason === "password_expired" ? "PASSWORD_EXPIRED" : "INVALID_CREDENTIALS",
        message:
          result.reason === "password_expired"
            ? ROOM_PASSWORD_EXPIRED_ERROR
            : ROOM_JOIN_ERROR,
        statusCode: 401,
      });
      return;
    }

    res.status(200).json({ success: true, data: result.preview });
  } catch (error) {
    console.error("previewRoomJoin error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while checking room",
      statusCode: 500,
    });
  }
};

// POST /api/rooms/join  { room_code, password, registration_data? }
export const joinRoom = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const result = await joinRoomWithPassword(
      {
        findRoomByCode: (code) => roomRepo.findRoomByCode(code),
        addMember: (roomId, memberUserId, role, registrationData) =>
          roomRepo.addMemberIdempotent(roomId, memberUserId, role, registrationData),
      },
      {
        roomCode: String(req.body.room_code ?? ""),
        password: String(req.body.password ?? ""),
        userId: String(userId),
        registrationData: req.body.registration_data,
      }
    );

    if (!result.ok) {
      if (result.reason !== "registration_invalid") {
        // One response for bad code, bad password, archived and closed rooms.
        // Expiry is only reported after a correct password, so it is not a
        // credential oracle.
        res.status(401).json({
          success: false,
          code:
            result.reason === "password_expired"
              ? "PASSWORD_EXPIRED"
              : "INVALID_CREDENTIALS",
          message:
            result.reason === "password_expired"
              ? ROOM_PASSWORD_EXPIRED_ERROR
              : ROOM_JOIN_ERROR,
          statusCode: 401,
        });
        return;
      }

      res.status(400).json({
        success: false,
        code: "REGISTRATION_INVALID",
        message: "Please complete the registration form.",
        statusCode: 400,
        fieldErrors: result.fieldErrors,
        registration_form: result.form,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { room: result.room },
    });
  } catch (error) {
    console.error("joinRoom error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while joining room",
      statusCode: 500,
    });
  }
};

// GET /api/rooms/:id/registration-form  (owner or member)
export const getRoomRegistrationForm = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const roomId = String(req.params.id ?? "");
    if (!/^\d+$/.test(roomId)) {
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    const room = await roomRepo.getRoomForMember(roomId, String(userId));
    if (!room) {
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    res.status(200).json({
      success: true,
      data: normalizeRoomRegistrationForm(room.registration_form),
    });
  } catch (error) {
    console.error("getRoomRegistrationForm error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// PUT /api/rooms/:id/registration-form  (teacher owner)
export const updateRoomRegistrationForm = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const roomId = String(req.params.id ?? "");
    if (!/^\d+$/.test(roomId)) {
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    const form = normalizeRoomRegistrationForm(req.body);
    const room = await roomRepo.updateRoomRegistrationForm(
      roomId,
      String(userId),
      form
    );
    if (!room) {
      // Same response for "does not exist" and "not yours".
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    res.status(200).json({
      success: true,
      data: normalizeRoomRegistrationForm(room.registration_form),
    });
  } catch (error) {
    console.error("updateRoomRegistrationForm error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving the registration form",
      statusCode: 500,
    });
  }
};

// GET /api/rooms/enrolled  (authenticated) — every room the current student
// has joined, with the teacher owner and member count for the sidebar page.
export const getEnrolledRooms = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const rooms = await roomRepo.getRoomsForMember(String(userId));

    res.status(200).json({
      success: true,
      data: rooms.map((room) => ({
        id: String(room.id),
        name: room.name,
        description: room.description ?? null,
        room_code: room.room_code,
        is_active: room.is_active !== false,
        member_count: Number(room.member_count ?? 0),
        joined_at: room.joined_at ?? null,
        created_at: room.created_at ?? null,
        updated_at: room.updated_at ?? null,
        owner: {
          id: String(room.owner_id),
          username: room.owner_username ?? null,
          displayName: room.owner_display_name ?? null,
          avatarId: room.owner_avatar_id ?? null,
          avatarUrl: room.owner_avatar_url ?? null,
        },
      })),
    });
  } catch (error) {
    console.error("getEnrolledRooms error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while loading your rooms",
      statusCode: 500,
    });
  }
};

// GET /api/rooms/:id  (owner or member) — room summary plus the member roster
// students see after joining (usernames, avatars, join dates).
export const getRoomSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", statusCode: 401 });
      return;
    }

    const roomId = String(req.params.id ?? "");
    if (!/^\d+$/.test(roomId)) {
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    const room = await roomRepo.getRoomForMember(roomId, String(userId));
    if (!room || room.is_active === false) {
      res.status(404).json({ success: false, message: "Room not found", statusCode: 404 });
      return;
    }

    const members = await roomRepo.getRoomMembers(roomId);

    res.status(200).json({
      success: true,
      data: {
        id: String(room.id),
        name: room.name,
        description: room.description ?? null,
        room_code: room.room_code,
        memberCount: Number(room.member_count ?? members.length),
        password_expires_at: roomPasswordExpiresAtIso(room),
        registration_form: normalizeRoomRegistrationForm(room.registration_form),
        is_owner: String(room.owner_id) === String(userId),
        owner: {
          id: String(room.owner_id),
          username: room.owner_username ?? null,
          displayName: room.owner_display_name ?? null,
          avatarId: room.owner_avatar_id ?? null,
          avatarUrl: room.owner_avatar_url ?? null,
        },
        members: members.map((member) => ({
          id: member.user.id,
          username: member.user.username,
          displayName: member.user.displayName ?? member.user.username,
          firstName: member.user.firstName ?? null,
          lastName: member.user.lastName ?? null,
          avatarId: member.user.avatarId ?? null,
          avatarUrl: member.user.avatarUrl ?? null,
          joinedAt: member.joinedAt ?? null,
          status: member.statusName ?? null,
          is_you: String(member.user.id) === String(userId),
        })),
      },
    });
  } catch (error) {
    console.error("getRoomSummary error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      statusCode: 500,
    });
  }
};
