// Contest data access layer. SQL queries for listing, fetching by ID, fetching
// contest problems, checking user registration, and registering users for contests.
import { pool } from "../app.ts";

export class ContestRepository {
  /**
   * Get all contests (upcoming + past)
   */
  async getAllContests(): Promise<any[]> {
    const query = `
      SELECT
        c.id,
        c.name,
        c.starttime,
        c.duration,
        c.created_at,
        c.updated_at
      FROM contest c
      ORDER BY c.starttime DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get a single contest by ID
   */
  async getContestById(contestId: string): Promise<any | null> {
    const query = `
      SELECT
        c.id,
        c.name,
        c.starttime,
        c.duration,
        c.created_at,
        c.updated_at
      FROM contest c
      WHERE c.id = $1
    `;
    const result = await pool.query(query, [contestId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all problems for a contest
   */
  async getContestProblems(contestId: string): Promise<any[]> {
    const query = `
      SELECT
        p.id,
        p.problem_id,
        p.title,
        p.rating,
        p.problem_index,
        p.time_limit_ms,
        p.memory_limit_mb,
        p.source
      FROM problems p
      WHERE p.contest_id = $1
      ORDER BY p.problem_index ASC
    `;
    const result = await pool.query(query, [contestId]);
    return result.rows;
  }

  /**
   * Check if a user is registered for a contest
   * Note: contest_registeration table currently has no contest_id column.
   * This checks by user_id only (documented in connect_fe_be.md).
   */
  async isUserRegistered(userId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM contest_registeration
      WHERE user_id = $1 AND is_registered = true
      LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0;
  }

  /**
   * Register a user for a contest
   * Note: contest_registeration table currently has no contest_id column.
   * This registers by user_id only (documented in connect_fe_be.md).
   */
  async registerUser(userId: string, rated: boolean = false): Promise<any> {
    const query = `
      INSERT INTO contest_registeration (user_id, is_registered, rated, createdat, updatedat)
      VALUES ($1, true, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
      SET is_registered = true, rated = $2, updatedat = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [userId, rated]);
    return result.rows[0];
  }

  /**
   * Get user's contest registrations
   */
  async getUserContests(userId: string): Promise<any[]> {
    const query = `
      SELECT
        c.id,
        c.name,
        c.starttime,
        c.duration,
        cr.is_registered,
        cr.rated,
        cr.createdat AS registered_at
      FROM contest_registeration cr
      JOIN contest c ON c.id = cr.id
      WHERE cr.user_id = $1
      ORDER BY c.starttime DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}