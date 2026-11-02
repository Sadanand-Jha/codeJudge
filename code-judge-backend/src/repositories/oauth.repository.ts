// Database access for OAuth identity linking. Provider identities are stored on
// the existing users row (oauth_provider + oauth_provider_user_id), so all
// profile, role, and session code continues to work without a second user table.
import { pool } from "../config/database.ts";
import type { OAuthProfile, OAuthProvider } from "../types/oauth.ts";

const DEFAULT_AVATAR = "/api/v1/avatars/1";

interface OAuthUserRecord {
  id: number;
  email: string;
  oauth_onboarding_completed: boolean;
}

export interface OAuthUserRow {
  id: string;
  email: string;
  needsOnboarding: boolean;
}

export class OAuthUsernameTakenError extends Error {
  constructor() {
    super("Username is already taken");
    this.name = "OAuthUsernameTakenError";
  }
}

function toUserRow(record: OAuthUserRecord): OAuthUserRow {
  return {
    id: String(record.id),
    email: record.email,
    needsOnboarding: record.oauth_onboarding_completed === false,
  };
}

export class OAuthRepository {
  async findByProvider(provider: OAuthProvider, providerUserId: string): Promise<OAuthUserRow | null> {
    const result = await pool.query<OAuthUserRecord>(
      `SELECT id, email, oauth_onboarding_completed
         FROM users
        WHERE oauth_provider = $1 AND oauth_provider_user_id = $2
        LIMIT 1`,
      [provider, providerUserId],
    );
    return result.rows[0] ? toUserRow(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<OAuthUserRow | null> {
    const result = await pool.query<OAuthUserRecord>(
      `SELECT id, email, oauth_onboarding_completed
         FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [email],
    );
    return result.rows[0] ? toUserRow(result.rows[0]) : null;
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

      const result = await client.query<OAuthUserRecord>(
        `INSERT INTO users (
           username, email, password, role_id, avatar_id, isactive,
           display_name, first_name, last_name, is_verified,
           oauth_provider, oauth_provider_user_id, oauth_onboarding_completed,
           createdat, created_at, updatedat, updated_at, lastlogin
         ) VALUES (
           $1, $2, $3, $4, $5, TRUE,
           $6, $7, $8, TRUE,
           $9, $10, FALSE,
           NOW(), NOW(), NOW(), NOW(), NOW()
         )
         RETURNING id, email, oauth_onboarding_completed`,
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
      return toUserRow(result.rows[0]);
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

      // Email is an immutable account identity field. Refreshing an OAuth
      // login must never rewrite it, even if the provider reports a change.
      const result = await client.query<OAuthUserRecord>(
        `UPDATE users
            SET display_name = $2,
                first_name = COALESCE($3, first_name),
                last_name = COALESCE($4, last_name),
                avatar_id = COALESCE($5, avatar_id),
                is_verified = TRUE,
                oauth_provider = $6,
                oauth_provider_user_id = $7,
                lastlogin = NOW(),
                updatedat = NOW(),
                updated_at = NOW()
          WHERE id = $1
          RETURNING id, email, oauth_onboarding_completed`,
        [
          userId,
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
      return toUserRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /** Persist the one-time OAuth username/avatar choice. Returns null when the
   * account is missing or onboarding was already completed. */
  async completeOnboarding(
    userId: string,
    username: string,
    avatarUrl: string,
    accountType: "student" | "teacher",
  ): Promise<OAuthUserRow | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const pending = await client.query(
        `SELECT 1 FROM users WHERE id = $1 AND oauth_onboarding_completed = FALSE FOR UPDATE`,
        [userId],
      );
      if (!pending.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }

      const taken = await client.query(
        `SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1`,
        [username, userId],
      );
      if (taken.rows[0]) {
        throw new OAuthUsernameTakenError();
      }

      const role = await client.query<{ id: number }>(
        `SELECT id FROM role WHERE LOWER(name) = $1 LIMIT 1`,
        [accountType],
      );
      if (!role.rows[0]) {
        throw new Error(`Registration role is not configured: ${accountType}`);
      }

      const avatarId = await this.upsertAvatar(client, avatarUrl);
      const result = await client.query<OAuthUserRecord>(
        `UPDATE users
            SET username = LOWER($2),
                avatar_id = $3,
                role_id = $4,
                oauth_onboarding_completed = TRUE,
                updatedat = NOW(),
                updated_at = NOW()
          WHERE id = $1 AND oauth_onboarding_completed = FALSE
          RETURNING id, email, oauth_onboarding_completed`,
        [userId, username, avatarId, role.rows[0].id],
      );

      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query("COMMIT");
      return toUserRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (isUniqueViolation(error, "idx_users_username_lower_unique")) {
        throw new OAuthUsernameTakenError();
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const candidate = error as { code?: string; constraint?: string } | null;
  return candidate?.code === "23505" && candidate.constraint === constraint;
}

export const oauthRepository = new OAuthRepository();
