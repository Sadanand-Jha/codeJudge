// Database access for OAuth identity linking. Provider identities are stored on
// the existing users row (oauth_provider + oauth_provider_user_id), so all
// profile, role, and session code continues to work without a second user table.
import { pool } from "../config/database.ts";
import type { OAuthProfile, OAuthProvider } from "../types/oauth.ts";

const DEFAULT_AVATAR = "/api/v1/avatars/1";

export interface OAuthUserRow {
  id: string;
  email: string;
}

export class OAuthRepository {
  async findByProvider(provider: OAuthProvider, providerUserId: string): Promise<OAuthUserRow | null> {
    const result = await pool.query<{ id: number; email: string }>(
      `SELECT id, email
         FROM users
        WHERE oauth_provider = $1 AND oauth_provider_user_id = $2
        LIMIT 1`,
      [provider, providerUserId],
    );
    return result.rows[0] ? { id: String(result.rows[0].id), email: result.rows[0].email } : null;
  }

  async findByEmail(email: string): Promise<OAuthUserRow | null> {
    const result = await pool.query<{ id: number; email: string }>(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    return result.rows[0] ? { id: String(result.rows[0].id), email: result.rows[0].email } : null;
  }

  async usernameExists(username: string): Promise<boolean> {
    const result = await pool.query(`SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`, [username]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Insert the provider avatar once, or reuse the existing avatar row. */
  private async upsertAvatar(client: { query: typeof pool.query }, avatarUrl: string): Promise<number> {
    const result = await client.query<{ id: number }>(
      `INSERT INTO avatar (is_male, url, created_at, updated_at)
       VALUES (true, $1, NOW(), NOW())
       ON CONFLICT (url) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [avatarUrl],
    );
    return result.rows[0].id;
  }

  async create(
    profile: OAuthProfile,
    username: string,
    passwordHash: string,
  ): Promise<OAuthUserRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const avatarId = await this.upsertAvatar(client, profile.avatarUrl || DEFAULT_AVATAR);
      const role = await client.query<{ id: number }>(
        `SELECT id FROM role WHERE LOWER(name) = 'student' LIMIT 1`,
      );
      if (!role.rows[0]) {
        throw new Error("Student role is not configured");
      }

      const result = await client.query<{ id: number; email: string }>(
        `INSERT INTO users (
           username, email, password, role_id, avatar_id, isactive,
           display_name, first_name, last_name, is_verified,
           oauth_provider, oauth_provider_user_id,
           createdat, created_at, updatedat, updated_at, lastlogin
         ) VALUES (
           $1, $2, $3, $4, $5, TRUE,
           $6, $7, $8, TRUE,
           $9, $10,
           NOW(), NOW(), NOW(), NOW(), NOW()
         )
         RETURNING id, email`,
        [
          username,
          profile.email,
          passwordHash,
          role.rows[0].id,
          avatarId,
          profile.name.slice(0, 120),
          profile.firstName?.slice(0, 80) || null,
          profile.lastName?.slice(0, 80) || null,
          profile.provider,
          profile.providerUserId,
        ],
      );

      await client.query("COMMIT");
      return { id: String(result.rows[0].id), email: result.rows[0].email };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async update(userId: string, profile: OAuthProfile): Promise<OAuthUserRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const avatarId = profile.avatarUrl ? await this.upsertAvatar(client, profile.avatarUrl) : null;

      const result = await client.query<{ id: number; email: string }>(
        `UPDATE users
            SET email = $2,
                display_name = $3,
                first_name = COALESCE($4, first_name),
                last_name = COALESCE($5, last_name),
                avatar_id = COALESCE($6, avatar_id),
                is_verified = TRUE,
                oauth_provider = $7,
                oauth_provider_user_id = $8,
                lastlogin = NOW(),
                updatedat = NOW(),
                updated_at = NOW()
          WHERE id = $1
          RETURNING id, email`,
        [
          userId,
          profile.email,
          profile.name.slice(0, 120),
          profile.firstName?.slice(0, 80) || null,
          profile.lastName?.slice(0, 80) || null,
          avatarId,
          profile.provider,
          profile.providerUserId,
        ],
      );

      if (!result.rows[0]) {
        throw new Error("OAuth user no longer exists");
      }

      await client.query("COMMIT");
      return { id: String(result.rows[0].id), email: result.rows[0].email };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

export const oauthRepository = new OAuthRepository();
