// Room data access layer. SQL queries for creating/listing rooms, managing members
// (add/remove/status), searching users, and generating unique room codes.
import { pool } from "../config/database.ts";
import { generateRoomCode, generateRoomPassword } from "../utils/roomCode.ts";
import { hashRoomPassword } from "../services/roomAccess.service.ts";

export class RoomRepository {
  async createRoom(ownerId: string, name: string, description?: string) {
    // Every room carries a password, even when the caller does not use the
    // share screen. The plaintext is intentionally discarded here.
    const passwordHash = await hashRoomPassword(generateRoomPassword());
    for (let attempt = 0; attempt < 10; attempt++) {
      const roomCode = generateRoomCode();
      try {
        const result = await pool.query(
          `INSERT INTO quiz_rooms (owner_id, name, description, room_code, password_hash, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
           RETURNING id, owner_id, room_code, name, description, visibility, is_active, created_at, updated_at`,
          [ownerId, name, description || null, roomCode, passwordHash]
        );
        return result.rows[0];
      } catch (error) {
        if ((error as { code?: string })?.code === "23505") continue;
        throw error;
      }
    }
    throw new Error("ROOM_CODE_GENERATION_FAILED");
  }

  async roomCodeExists(roomCode: string): Promise<boolean> {
    const result = await pool.query("SELECT 1 FROM quiz_rooms WHERE room_code = $1 LIMIT 1", [roomCode]);
    return result.rows.length > 0;
  }

  async insertRoom(input: {
    ownerId: string;
    name: string;
    description?: string | null;
    roomCode: string;
    passwordHash: string;
  }) {
    const result = await pool.query(
      `INSERT INTO quiz_rooms (owner_id, name, description, room_code, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, owner_id, room_code, name, description, visibility, is_active, created_at, updated_at`,
      [input.ownerId, input.name, input.description ?? null, input.roomCode, input.passwordHash]
    );
    return result.rows[0];
  }

  async findRoomByCode(roomCode: string) {
    const result = await pool.query(
      `SELECT id, owner_id, name, room_code, password_hash, is_active, registration_form
       FROM quiz_rooms WHERE room_code = $1 LIMIT 1`,
      [roomCode]
    );
    return result.rows[0] || null;
  }

  async updateRoomPassword(roomCode: string, ownerId: string, passwordHash: string) {
    const result = await pool.query(
      `UPDATE quiz_rooms
       SET password_hash = $1, updated_at = NOW()
       WHERE room_code = $2 AND owner_id::text = $3
       RETURNING id, name, room_code, owner_id`,
      [passwordHash, roomCode, String(ownerId)]
    );
    return result.rows[0] || null;
  }

  async updateRoomRegistrationForm(
    roomId: string,
    ownerId: string,
    registrationForm: unknown
  ) {
    const result = await pool.query(
      `UPDATE quiz_rooms
       SET registration_form = $1::jsonb, updated_at = NOW()
       WHERE id::text = $2 AND owner_id::text = $3
       RETURNING id, name, room_code, registration_form`,
      [JSON.stringify(registrationForm), String(roomId), String(ownerId)]
    );
    return result.rows[0] || null;
  }

  async getRoomForMember(roomId: string, userId: string) {
    const result = await pool.query(
      `SELECT qr.id, qr.name, qr.room_code, qr.is_active, qr.registration_form,
              COALESCE(cnt.member_count, 0)::int AS member_count
       FROM quiz_rooms qr
       LEFT JOIN (
         SELECT room_id, COUNT(*) AS member_count
         FROM room_members GROUP BY room_id
       ) cnt ON cnt.room_id = qr.id
       WHERE qr.id::text = $1
         AND (
           qr.owner_id::text = $2
           OR EXISTS (
             SELECT 1 FROM room_members rm
             WHERE rm.room_id = qr.id AND rm.user_id::text = $2
           )
         )
       LIMIT 1`,
      [String(roomId), String(userId)]
    );
    return result.rows[0] || null;
  }

  async countRoomsByOwner(ownerId: string): Promise<number> {
    const result = await pool.query("SELECT COUNT(*)::int as count FROM quiz_rooms WHERE owner_id = $1", [ownerId]);
    return result.rows[0]?.count ?? 0;
  }

  async getRoomsByOwner(ownerId: string) {
    const result = await pool.query(
      `SELECT qr.id, qr.owner_id, qr.name, qr.description, qr.visibility, qr.is_active, qr.created_at, qr.updated_at,
              COALESCE(cnt.member_count,0)::int as member_count
       FROM quiz_rooms qr
       LEFT JOIN (SELECT room_id, COUNT(*) as member_count FROM room_members GROUP BY room_id) cnt ON cnt.room_id = qr.id
       WHERE qr.owner_id = $1
       ORDER BY qr.updated_at DESC`,
      [ownerId]
    );
    return result.rows;
  }

  async getRoomById(roomId: string, ownerId?: string) {
    const params: unknown[] = [String(roomId)];
    let whereOwner = "";
    if (ownerId) {
      params.push(ownerId);
      whereOwner = "AND qr.owner_id = $2";
    }
    const result = await pool.query(
      `SELECT qr.id, qr.owner_id, qr.name, qr.description, qr.visibility, qr.is_active,
              qr.registration_form, qr.created_at, qr.updated_at
       FROM quiz_rooms qr WHERE qr.id::text = $1 ${whereOwner} LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async getRoomMembers(roomId: string) {
    const result = await pool.query(
      `SELECT rm.id as membership_id, rm.room_id, rm.user_id, rm.status, rm.joined_at,
              rm.registration_data,
              u.id, u.username, u.first_name, u.last_name, u.display_name, u.avatar_id,
              a.url as avatar_url, s.name as status_name
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       LEFT JOIN avatar a ON u.avatar_id = a.id
       LEFT JOIN room_member_status s ON rm.status = s.id
       WHERE rm.room_id::text = $1
       ORDER BY rm.joined_at ASC`,
      [String(roomId)]
    );
    return result.rows.map((r) => ({
      membershipId: r.membership_id,
      roomId: r.room_id,
      userId: String(r.user_id),
      status: r.status,
      statusName: r.status_name,
      joinedAt: r.joined_at,
      registrationData: r.registration_data ?? null,
      user: {
        id: String(r.id),
        username: r.username,
        firstName: r.first_name,
        lastName: r.last_name,
        displayName: r.display_name,
        avatarId: r.avatar_id,
        avatarUrl: r.avatar_url,
      },
    }));
  }

  async findUserByUsername(username: string) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.display_name, u.avatar_id, a.url as avatar_url
       FROM users u LEFT JOIN avatar a ON u.avatar_id = a.id
       WHERE LOWER(u.username) = LOWER($1) LIMIT 1`,
      [username.trim()]
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      id: String(r.id),
      username: r.username,
      firstName: r.first_name,
      lastName: r.last_name,
      displayName: r.display_name,
      avatarId: r.avatar_id,
      avatarUrl: r.avatar_url,
    };
  }

  async isMember(roomId: string, userId: string) {
    const result = await pool.query("SELECT 1 FROM room_members WHERE room_id::text=$1 AND user_id::text=$2 LIMIT 1", [String(roomId), String(userId)]);
    return result.rows.length > 0;
  }

  async addMember(roomId: string, userId: string) {
    // Ensure roomId is numeric (DB side), otherwise fail gracefully
    if (!/^\d+$/.test(String(roomId))) throw new Error("ROOM_NOT_FOUND");
    const result = await pool.query(
      `INSERT INTO room_members (room_id, user_id, status, joined_at, created_at, updated_at)
       VALUES ($1::int, $2::int, 1, NOW(), NOW(), NOW())
       ON CONFLICT (room_id, user_id) DO NOTHING
       RETURNING *`,
      [roomId, userId]
    );
    if (result.rows.length === 0) {
      const existing = await pool.query("SELECT * FROM room_members WHERE room_id::text=$1 AND user_id::text=$2 LIMIT 1", [String(roomId), String(userId)]);
      if (existing.rows.length === 0) throw new Error("ROOM_NOT_FOUND");
      return { alreadyExists: true, member: existing.rows[0] };
    }
    await pool.query("UPDATE quiz_rooms SET updated_at = NOW() WHERE id::text=$1", [String(roomId)]);
    return { alreadyExists: false, member: result.rows[0] };
  }

  /**
   * Self-service join. Joining twice is a success, not a conflict: the unique
   * (room_id, user_id) constraint is used for ON CONFLICT DO NOTHING.
   */
  async addMemberIdempotent(
    roomId: string | number,
    userId: string,
    role = "student",
    registrationData: Record<string, string> | null = null
  ) {
    const result = await pool.query(
      `INSERT INTO room_members
         (room_id, user_id, status, role, registration_data, joined_at, created_at, updated_at)
       VALUES ($1::int, $2::int, 1, $3, $4::jsonb, NOW(), NOW(), NOW())
       ON CONFLICT (room_id, user_id) DO NOTHING
       RETURNING id`,
      [roomId, userId, role, registrationData ? JSON.stringify(registrationData) : null]
    );

    if (result.rows.length > 0) {
      await pool.query("UPDATE quiz_rooms SET updated_at = NOW() WHERE id::text=$1", [String(roomId)]);
      return { inserted: true };
    }
    return { inserted: false };
  }

  async removeMember(roomId: string, userId: string) {
    // Allow identifier to be username or id
    let targetUserId = userId;
    if (!/^\d+$/.test(String(userId))) {
      const u = await this.findUserByUsername(String(userId));
      if (!u) return null;
      targetUserId = u.id;
    }
    const result = await pool.query("DELETE FROM room_members WHERE room_id::text=$1 AND user_id::text=$2 RETURNING *", [String(roomId), String(targetUserId)]);
    if (result.rows.length > 0) {
      await pool.query("UPDATE quiz_rooms SET updated_at = NOW() WHERE id::text=$1", [String(roomId)]);
    }
    return result.rows[0] || null;
  }

  async updateMemberStatus(roomId: string, userId: string, active: boolean) {
    let targetUserId = userId;
    if (!/^\d+$/.test(String(userId))) {
      const u = await this.findUserByUsername(String(userId));
      if (!u) return null;
      targetUserId = u.id;
    }
    if (!/^\d+$/.test(String(roomId))) throw new Error("ROOM_NOT_FOUND");
    const statusId = active ? 1 : 2;
    const result = await pool.query(
      `UPDATE room_members SET status=$1, updated_at=NOW() WHERE room_id::text=$2 AND user_id::text=$3 RETURNING *`,
      [statusId, String(roomId), String(targetUserId)]
    );
    if (result.rows.length === 0) return null;
    await pool.query("UPDATE quiz_rooms SET updated_at = NOW() WHERE id::text=$1", [String(roomId)]);
    return result.rows[0];
  }

  async updateRoom(roomId: string, ownerId: string, patch: { name?: string; description?: string; isActive?: boolean }) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (patch.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(patch.name);
    }
    if (patch.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(patch.description);
    }
    if (patch.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(patch.isActive);
    }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);
    values.push(String(roomId), String(ownerId));
    const result = await pool.query(
      `UPDATE quiz_rooms SET ${fields.join(", ")} WHERE id::text = $${idx++} AND owner_id::text = $${idx++} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async searchUsers(query: string, limit = 10) {
    const q = `%${query.trim().toLowerCase()}%`;
    const result = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.first_name, u.last_name, u.avatar_id, a.url as avatar_url
       FROM users u LEFT JOIN avatar a ON u.avatar_id = a.id
       WHERE LOWER(u.username) LIKE $1 OR LOWER(COALESCE(u.display_name,'')) LIKE $1
       ORDER BY u.username ASC LIMIT $2`,
      [q, limit]
    );
    return result.rows.map((r) => ({
      id: String(r.id),
      username: r.username,
      displayName: r.display_name,
      firstName: r.first_name,
      lastName: r.last_name,
      avatarId: r.avatar_id,
      avatarUrl: r.avatar_url,
    }));
  }

  async getRoomsForStudent(ownerId: string, username: string) {
    const result = await pool.query(
      `SELECT qr.id, qr.owner_id, qr.name, qr.description, qr.visibility, qr.is_active, qr.created_at, qr.updated_at,
              COALESCE(cnt.member_count,0)::int as member_count
       FROM quiz_rooms qr
       JOIN room_members rm ON rm.room_id = qr.id
       JOIN users u ON rm.user_id = u.id
       LEFT JOIN (SELECT room_id, COUNT(*) as member_count FROM room_members GROUP BY room_id) cnt ON cnt.room_id = qr.id
       WHERE qr.owner_id::text = $1 AND LOWER(u.username) = LOWER($2)
       ORDER BY qr.updated_at DESC`,
      [String(ownerId), String(username).trim()]
    );
    return result.rows;
  }
}
