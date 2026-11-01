// Room announcements service. Only the room owner can create, edit or delete
// announcements; owners and members can read them.
import pool from "../config/database.ts";
import { RoomRepository } from "../repositories/room.repository.ts";

const roomRepo = new RoomRepository();

export class RoomAnnouncementError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "RoomAnnouncementError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface RoomAnnouncementRow {
  id: number;
  room_id: number;
  author_id: number;
  title: string;
  body: string;
  created_at: Date | string;
  updated_at: Date | string;
  author_username?: string | null;
  author_display_name?: string | null;
}

export interface RoomAnnouncementDTO {
  id: string;
  roomId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
}

function positiveRoomId(roomId: unknown): number {
  const id = Number(roomId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new RoomAnnouncementError(400, "INVALID_ROOM", "Invalid room id.");
  }
  return id;
}

function positiveAnnouncementId(announcementId: unknown): number {
  const id = Number(announcementId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new RoomAnnouncementError(400, "INVALID_ANNOUNCEMENT", "Invalid announcement id.");
  }
  return id;
}

async function assertRoomOwner(roomId: number, userId: string) {
  const room = await roomRepo.getRoomById(String(roomId), String(userId));
  if (!room) {
    throw new RoomAnnouncementError(404, "ROOM_NOT_FOUND", "Room not found.");
  }
  return room;
}

async function assertRoomMember(roomId: number, userId: string) {
  const room = await roomRepo.getRoomForMember(String(roomId), String(userId));
  if (!room) {
    throw new RoomAnnouncementError(404, "ROOM_NOT_FOUND", "Room not found.");
  }
  return room;
}

function cleanTitle(value: unknown): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) {
    throw new RoomAnnouncementError(400, "TITLE_REQUIRED", "Add a title for the announcement.");
  }
  if (title.length > 160) {
    throw new RoomAnnouncementError(400, "TITLE_TOO_LONG", "Titles can be at most 160 characters.");
  }
  return title;
}

function cleanBody(value: unknown): string {
  const body = typeof value === "string" ? value.trim() : "";
  if (!body) {
    throw new RoomAnnouncementError(400, "BODY_REQUIRED", "Add a message for the announcement.");
  }
  if (body.length > 5000) {
    throw new RoomAnnouncementError(400, "BODY_TOO_LONG", "Messages can be at most 5000 characters.");
  }
  return body;
}

function serializeAnnouncement(row: RoomAnnouncementRow): RoomAnnouncementDTO {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    title: row.title,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    author: {
      id: String(row.author_id),
      username: row.author_username ?? null,
      displayName: row.author_display_name ?? null,
    },
  };
}

export async function listRoomAnnouncements(
  roomIdInput: string | number,
  userId: string
): Promise<RoomAnnouncementDTO[]> {
  const roomId = positiveRoomId(roomIdInput);
  await assertRoomMember(roomId, userId);
  const result = await pool.query<RoomAnnouncementRow>(
    `SELECT ra.*, u.username AS author_username, u.display_name AS author_display_name
     FROM room_announcements ra
     JOIN users u ON u.id = ra.author_id
     WHERE ra.room_id = $1
     ORDER BY ra.created_at DESC, ra.id DESC`,
    [roomId]
  );
  return result.rows.map(serializeAnnouncement);
}

export async function createRoomAnnouncement(
  roomIdInput: string | number,
  userId: string,
  input: { title: unknown; body: unknown }
): Promise<RoomAnnouncementDTO> {
  const roomId = positiveRoomId(roomIdInput);
  await assertRoomOwner(roomId, userId);
  const title = cleanTitle(input.title);
  const body = cleanBody(input.body);

  const inserted = await pool.query<RoomAnnouncementRow>(
    `INSERT INTO room_announcements (room_id, author_id, title, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [roomId, Number(userId), title, body]
  );

  return {
    ...serializeAnnouncement(inserted.rows[0]),
    author: {
      id: String(userId),
      username: null,
      displayName: null,
    },
  };
}

export async function updateRoomAnnouncement(
  roomIdInput: string | number,
  announcementIdInput: string | number,
  userId: string,
  input: { title: unknown; body: unknown }
): Promise<RoomAnnouncementDTO> {
  const roomId = positiveRoomId(roomIdInput);
  const announcementId = positiveAnnouncementId(announcementIdInput);
  await assertRoomOwner(roomId, userId);
  const title = cleanTitle(input.title);
  const body = cleanBody(input.body);

  const updated = await pool.query<RoomAnnouncementRow>(
    `UPDATE room_announcements
     SET title = $1, body = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND room_id = $4
     RETURNING *`,
    [title, body, announcementId, roomId]
  );
  const row = updated.rows[0];
  if (!row) {
    throw new RoomAnnouncementError(404, "NOT_FOUND", "Announcement not found.");
  }

  const author = await pool.query<{
    id: number;
    username: string | null;
    display_name: string | null;
  }>("SELECT id, username, display_name FROM users WHERE id = $1", [row.author_id]);

  return {
    ...serializeAnnouncement(row),
    author: {
      id: String(row.author_id),
      username: author.rows[0]?.username ?? null,
      displayName: author.rows[0]?.display_name ?? null,
    },
  };
}

export async function deleteRoomAnnouncement(
  roomIdInput: string | number,
  announcementIdInput: string | number,
  userId: string
): Promise<{ deletedId: string }> {
  const roomId = positiveRoomId(roomIdInput);
  const announcementId = positiveAnnouncementId(announcementIdInput);
  await assertRoomOwner(roomId, userId);

  const deleted = await pool.query(
    "DELETE FROM room_announcements WHERE id = $1 AND room_id = $2 RETURNING id",
    [announcementId, roomId]
  );
  if (deleted.rows.length === 0) {
    throw new RoomAnnouncementError(404, "NOT_FOUND", "Announcement not found.");
  }
  return { deletedId: String(announcementId) };
}
