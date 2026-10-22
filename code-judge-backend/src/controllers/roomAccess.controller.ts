// Public room access controller — create-with-credentials, rotate password,
// join-by-code, and the member-visible room summary.
import type { Request, Response } from "express";
import { RoomRepository } from "../repositories/room.repository.ts";
import {
  ROOM_JOIN_ERROR,
  hashRoomPassword,
  insertRoomWithUniqueCode,
  joinRoomWithPassword,
  previewRoomJoinWithPassword,
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

    const { room } = await insertRoomWithUniqueCode({
      codeExists: (code) => roomRepo.roomCodeExists(code),
      insertRoom: (code) =>
        roomRepo.insertRoom({
          ownerId: String(userId),
          name,
          roomCode: code,
          passwordHash,
        }),
    });

    res.status(201).json({
      success: true,
      data: {
        id: String(room.id),
        name: room.name,
        room_code: room.room_code,
        password,
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
    const room = await roomRepo.updateRoomPassword(roomCode, String(userId), passwordHash);

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

    if (!result) {
      res.status(401).json({
        success: false,
        message: ROOM_JOIN_ERROR,
        statusCode: 401,
      });
      return;
    }

    res.status(200).json({ success: true, data: result });
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
      if (result.reason === "invalid_credentials") {
        // One response for bad code, bad password, archived and closed rooms.
        res.status(401).json({
          success: false,
          message: ROOM_JOIN_ERROR,
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

// GET /api/rooms/:id  (owner or member) — minimal summary for /rooms/:id.
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

    res.status(200).json({
      success: true,
      data: {
        id: String(room.id),
        name: room.name,
        room_code: room.room_code,
        memberCount: Number(room.member_count ?? 0),
        registration_form: normalizeRoomRegistrationForm(room.registration_form),
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
