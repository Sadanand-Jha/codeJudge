// Role guard for teacher-only room management. Roles live in the `role`
// table; the session JWT only carries the user id, so the role is re-read per
// request rather than trusted from the client.
import type { Request, Response, NextFunction } from "express";
import { pool } from "../config/database.ts";

const TEACHER_ROLES = new Set(["teacher", "admin"]);

export const requireTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required", statusCode: 401 });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT LOWER(r.name) AS role
       FROM users u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE u.id::text = $1
       LIMIT 1`,
      [String(userId)]
    );
    const role = result.rows[0]?.role as string | undefined;
    if (!role || !TEACHER_ROLES.has(role)) {
      res.status(403).json({
        success: false,
        message: "Only teachers can manage rooms",
        statusCode: 403,
      });
      return;
    }
    next();
  } catch (error) {
    console.error("requireTeacher error", error);
    res.status(503).json({
      success: false,
      message: "Unable to verify account role right now",
      statusCode: 503,
    });
  }
};

export default requireTeacher;
