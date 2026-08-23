import { pool } from "../app.ts";

export class FollowRepository {
  async follow(followerId: string, followingId: string): Promise<boolean> {
    const result = await pool.query(
      `INSERT INTO user_follows (follower_id, following_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING id`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM user_follows
       WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM user_follows
       WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  async getFollowers(userId: string) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.display_name,
              u.avatar_id, a.url as avatar_url,
              CASE WHEN f2.id IS NOT NULL THEN true ELSE false END as is_following
       FROM user_follows f
       JOIN users u ON f.follower_id = u.id
       LEFT JOIN avatar a ON u.avatar_id = a.id
       LEFT JOIN user_follows f2 ON f2.follower_id = $1 AND f2.following_id = u.id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows.map((r) => ({
      id: String(r.id),
      username: r.username,
      firstName: r.first_name,
      lastName: r.last_name,
      displayName: r.display_name,
      avatarId: r.avatar_id,
      avatarUrl: r.avatar_url,
      isFollowing: r.is_following,
    }));
  }

  async getFollowing(userId: string) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.display_name,
              u.avatar_id, a.url as avatar_url
       FROM user_follows f
       JOIN users u ON f.following_id = u.id
       LEFT JOIN avatar a ON u.avatar_id = a.id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows.map((r) => ({
      id: String(r.id),
      username: r.username,
      firstName: r.first_name,
      lastName: r.last_name,
      displayName: r.display_name,
      avatarId: r.avatar_id,
      avatarUrl: r.avatar_url,
    }));
  }

  async findUserByUsername(username: string) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.display_name,
              u.avatar_id, a.url as avatar_url
       FROM users u
       LEFT JOIN avatar a ON u.avatar_id = a.id
       WHERE LOWER(u.username) = LOWER($1)
       LIMIT 1`,
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

  async getFollowerCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM user_follows WHERE following_id = $1`,
      [userId]
    );
    return result.rows[0]?.cnt ?? 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM user_follows WHERE follower_id = $1`,
      [userId]
    );
    return result.rows[0]?.cnt ?? 0;
  }
}
